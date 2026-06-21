"""Code security enhancer.

The authoritative output is a deterministic transform:
  * Python  -> libcst AST rewrites (valid in, valid out — never broken code)
  * JavaScript -> conservative advisory analysis (no risky auto-edits)

Local Transformers models are optional, lazy-loaded extras surfaced as
alternative candidates only (gated by the ENABLE_MODELS env var).
"""
import os
import re
import difflib
import libcst as cst

MAX_CODE_CHARS = 8000
DEVICE = "cpu"
ENABLE_MODELS = os.getenv("ENABLE_MODELS", "true").lower() == "true"

MODEL_CONFIGS = {
    "Salesforce/codet5-base": "seq2seq",
    "microsoft/CodeGPT-small-py": "causal",
}

# ----------------------------------------------------------------------------
# Deterministic Python transforms (libcst)
# ----------------------------------------------------------------------------
ATTR_RENAME = {
    ("hashlib", "md5"): ("sha256", "MD5 is cryptographically broken; replaced with SHA-256."),
    ("hashlib", "sha1"): ("sha256", "SHA-1 is weak for security use; replaced with SHA-256."),
    ("yaml", "load"): ("safe_load", "yaml.load can execute arbitrary objects; replaced with yaml.safe_load."),
    ("ssl", "CERT_NONE"): ("CERT_REQUIRED", "ssl.CERT_NONE disables certificate validation; replaced with CERT_REQUIRED."),
}

# keyword -> (bad_literal, good_literal, reason)
KEYWORD_FLIPS = {
    "verify": ("False", "True", "Disabling TLS verification allows MITM attacks; set verify=True."),
    "shell": ("True", "False", "shell=True enables command injection; set shell=False and pass args as a list."),
    "debug": ("True", "False", "Flask debug mode exposes an interactive RCE console; set debug=False in production."),
}


class _SecurityTransformer(cst.CSTTransformer):
    def __init__(self):
        self.explanations = []

    def _add(self, change, reason):
        entry = {"change": change, "reason": reason}
        if entry not in self.explanations:
            self.explanations.append(entry)

    def leave_Attribute(self, original_node, updated_node):
        if isinstance(updated_node.value, cst.Name) and isinstance(updated_node.attr, cst.Name):
            key = (updated_node.value.value, updated_node.attr.value)
            if key in ATTR_RENAME:
                new_attr, reason = ATTR_RENAME[key]
                self._add(f"{key[0]}.{key[1]} -> {key[0]}.{new_attr}", reason)
                return updated_node.with_changes(attr=cst.Name(new_attr))
        return updated_node

    def leave_Arg(self, original_node, updated_node):
        kw = updated_node.keyword
        if kw is not None and kw.value in KEYWORD_FLIPS:
            bad, good, reason = KEYWORD_FLIPS[kw.value]
            val = updated_node.value
            if isinstance(val, cst.Name) and val.value == bad:
                self._add(f"{kw.value}={bad} -> {kw.value}={good}", reason)
                return updated_node.with_changes(value=cst.Name(good))
        return updated_node


def ast_patch_python(code: str):
    """Apply safe AST rewrites. Returns (patched_code, explanations). Unparseable code is returned untouched."""
    try:
        module = cst.parse_module(code)
    except Exception:
        return code, []
    transformer = _SecurityTransformer()
    new_module = module.visit(transformer)
    return new_module.code, transformer.explanations


# ----------------------------------------------------------------------------
# Advisory analysis (no code change) — for patterns with no safe auto-fix
# ----------------------------------------------------------------------------
ADVISORIES = [
    (re.compile(r"\beval\s*\("), "eval() executes arbitrary code; avoid it, or use ast.literal_eval for literals only."),
    (re.compile(r"\bexec\s*\("), "exec() executes arbitrary code strings; remove or sandbox it."),
    (re.compile(r"\bpickle\.loads?\s*\("), "pickle deserialization is an RCE risk; use JSON or another safe format."),
    (re.compile(r"\brandom\.(random|randint|choice|randrange)\s*\("), "The random module is not cryptographically secure; use the secrets module for security-sensitive values."),
    (re.compile(r"\btempfile\.mktemp\s*\("), "tempfile.mktemp() has a race condition; use tempfile.mkstemp()."),
    (re.compile(r"f[\"'][^\"']*SELECT[^\"']*\{", re.IGNORECASE), "String-formatted SQL enables injection; use parameterised queries with placeholders."),
    (re.compile(r"http://"), "Unencrypted HTTP transmits data in plaintext; prefer HTTPS where the endpoint supports it."),
]

JS_ADVISORIES = [
    (re.compile(r"\binnerHTML\s*[+]?="), "Assigning to innerHTML can introduce XSS; prefer textContent or sanitise with DOMPurify."),
    (re.compile(r"\bdocument\.write\s*\("), "document.write enables XSS; build DOM nodes instead."),
    (re.compile(r"\beval\s*\("), "eval() executes arbitrary JavaScript; use JSON.parse for data or a safe alternative."),
    (re.compile(r"\bMath\.random\s*\("), "Math.random is not cryptographically secure; use crypto.getRandomValues."),
    (re.compile(r"dangerouslySetInnerHTML"), "dangerouslySetInnerHTML bypasses React's XSS protection; sanitise input with DOMPurify first."),
    (re.compile(r"http://"), "Unencrypted HTTP in code; prefer HTTPS."),
]

SECRET_PATTERNS = [
    (re.compile(r'(?i)(?:password|passwd|pwd)\s*=\s*["\'][^"\']{8,}["\']'), "Hardcoded password detected — move it to an environment variable."),
    (re.compile(r'(?i)(?:api_key|apikey|secret_key|secret|auth_token)\s*=\s*["\'][a-zA-Z0-9+/=_\-]{16,}["\']'), "Hardcoded API key/secret detected — move it to an environment variable."),
    (re.compile(r"(?:AKIA|ASIA)[A-Z0-9]{16}"), "AWS Access Key ID pattern detected — never hardcode AWS credentials."),
    (re.compile(r'(?i)private_key\s*=\s*["\'][^"\']{10,}["\']'), "Hardcoded private key detected — load it from a secret store."),
]


def advisory_scan(code: str, language: str):
    findings = []
    seen = set()

    def add(reason):
        if reason not in seen:
            seen.add(reason)
            findings.append({"change": "Review needed", "reason": reason})

    rules = JS_ADVISORIES if language == "javascript" else ADVISORIES
    for pattern, reason in rules:
        if pattern.search(code):
            add(reason)
    for pattern, reason in SECRET_PATTERNS:
        if pattern.search(code):
            add(reason)
    return findings


# ----------------------------------------------------------------------------
# Diff
# ----------------------------------------------------------------------------
def create_diff(original: str, enhanced: str):
    formatted = []
    for line in difflib.unified_diff(original.splitlines(), enhanced.splitlines(), lineterm=""):
        if line.startswith("+") and not line.startswith("+++"):
            formatted.append({"type": "add", "content": line[1:]})
        elif line.startswith("-") and not line.startswith("---"):
            formatted.append({"type": "remove", "content": line[1:]})
        elif not line.startswith("@@"):
            formatted.append({"type": "context", "content": line})
    return formatted


# ----------------------------------------------------------------------------
# Optional local models (lazy)
# ----------------------------------------------------------------------------
_tokenizers = {}
_models = {}
_models_loaded = False


def _ensure_models_loaded():
    global _models_loaded
    if _models_loaded:
        return
    import torch
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForCausalLM

    torch.set_num_threads(max(1, (os.cpu_count() or 2) // 2))
    for name, mtype in MODEL_CONFIGS.items():
        try:
            tok = AutoTokenizer.from_pretrained(name, use_fast=False)
            cls = AutoModelForSeq2SeqLM if mtype == "seq2seq" else AutoModelForCausalLM
            model = cls.from_pretrained(name)
            try:
                model = torch.quantization.quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)
            except Exception:
                pass
            model.to(DEVICE).eval()
            _tokenizers[name] = tok
            _models[name] = model
        except Exception as e:
            print(f"[model] failed to load {name}: {e}")
    _models_loaded = True


def _run_model(model_name, code, language):
    import torch

    tokenizer = _tokenizers[model_name]
    model = _models[model_name]
    mtype = MODEL_CONFIGS[model_name]
    prompt = f"Fix security issues in this {language} code:\n{code}"
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).to(DEVICE)
    with torch.no_grad():
        if mtype == "seq2seq":
            outputs = model.generate(**inputs, max_new_tokens=256, num_beams=2)
        else:
            outputs = model.generate(**inputs, max_new_tokens=200, do_sample=True, temperature=0.3, top_p=0.95)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def _postprocess(code: str):
    code = re.sub(r'^"""|"""$', "", code.strip())
    return "\n".join(l.replace("\t", "    ").rstrip() for l in code.splitlines())


# ----------------------------------------------------------------------------
# Public API
# ----------------------------------------------------------------------------
def enhance_code(code: str, language: str):
    language = (language or "python").lower()

    if len(code) > MAX_CODE_CHARS:
        return {
            "enhanced_code": code,
            "diff": [],
            "candidates": [],
            "explanations": [{
                "change": "Input too large",
                "reason": f"Code exceeds the {MAX_CODE_CHARS} character limit. Please split it into smaller files.",
            }],
        }

    # Authoritative deterministic result.
    if language == "python":
        patched, explanations = ast_patch_python(code)
    else:
        patched, explanations = code, []

    explanations = explanations + advisory_scan(code, language)

    candidates = [{"model": "deterministic", "code": patched}]

    # Optional model candidates (best-effort, never affect the authoritative result).
    if ENABLE_MODELS:
        try:
            _ensure_models_loaded()
            for name in MODEL_CONFIGS:
                if name not in _models:
                    continue
                try:
                    candidates.append({"model": name, "code": _postprocess(_run_model(name, patched, language))})
                except Exception as e:
                    print(f"[model] generation failed for {name}: {e}")
        except Exception as e:
            print(f"[model] models unavailable: {e}")

    if not explanations:
        explanations = [{"change": "No issues found", "reason": "No known insecure patterns were detected."}]

    return {
        "enhanced_code": patched,
        "diff": create_diff(code, patched),
        "candidates": candidates[:3],
        "explanations": explanations,
    }
