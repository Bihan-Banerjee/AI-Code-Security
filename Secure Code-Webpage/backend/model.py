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
# Off by default: the small local models below are not instruction-tuned and
# produce garbage "fixes". The deterministic AST transform is the real engine.
# Only enable if a genuinely capable model is wired up in MODEL_CONFIGS.
ENABLE_MODELS = os.getenv("ENABLE_MODELS", "false").lower() == "true"

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
    ("hashlib", "md4"): ("sha256", "MD4 is cryptographically broken; replaced with SHA-256."),
    ("yaml", "load"): ("safe_load", "yaml.load can execute arbitrary objects; replaced with yaml.safe_load."),
    ("yaml", "unsafe_load"): ("safe_load", "yaml.unsafe_load can execute arbitrary objects; replaced with yaml.safe_load."),
    ("ssl", "CERT_NONE"): ("CERT_REQUIRED", "ssl.CERT_NONE disables certificate validation; replaced with CERT_REQUIRED."),
    ("ssl", "PROTOCOL_SSLv23"): ("PROTOCOL_TLS_SERVER", "SSLv2/3 are broken; replaced with a modern TLS protocol."),
    ("ssl", "PROTOCOL_SSLv3"): ("PROTOCOL_TLS_SERVER", "SSLv3 is broken (POODLE); replaced with a modern TLS protocol."),
    ("ssl", "PROTOCOL_TLSv1"): ("PROTOCOL_TLS_SERVER", "TLS 1.0 is deprecated; replaced with a modern TLS protocol."),
}

# keyword -> (bad_literal, good_literal, reason)
KEYWORD_FLIPS = {
    "verify": ("False", "True", "Disabling TLS verification allows MITM attacks; set verify=True."),
    # NOTE: shell=True is intentionally NOT auto-flipped — doing so on a string
    # command changes runtime behaviour. It is reported as an advisory instead.
    "debug": ("True", "False", "Flask debug mode exposes an interactive RCE console; set debug=False in production."),
    "autoescape": ("False", "True", "Disabling template autoescaping enables XSS; set autoescape=True."),
    "httponly": ("False", "True", "Cookies without HttpOnly are readable by JavaScript (XSS); set httponly=True."),
    "secure": ("False", "True", "Cookies without Secure can leak over plain HTTP; set secure=True."),
    "check_hostname": ("False", "True", "check_hostname=False disables TLS hostname verification; set it to True."),
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
    (re.compile(r"\bos\.system\s*\("), "os.system() runs a shell command; use subprocess.run([...], shell=False) with an argument list."),
    (re.compile(r"\bos\.(popen|spawn\w*)\s*\("), "os.popen/spawn invoke a shell; use subprocess with an argument list instead."),
    (re.compile(r"\bsubprocess\.[a-z_]+\([^)]*shell\s*=\s*True"), "subprocess with shell=True is a command-injection risk; pass args as a list and set shell=False."),
    (re.compile(r"\bpickle\.loads?\s*\("), "pickle deserialization is an RCE risk; use JSON or another safe format."),
    (re.compile(r"\b(?:marshal|shelve)\.loads?\s*\("), "marshal/shelve deserialization can execute arbitrary objects; use a safe format like JSON."),
    (re.compile(r"\brandom\.(random|randint|choice|randrange|getrandbits)\s*\("), "The random module is not cryptographically secure; use the secrets module for security-sensitive values."),
    (re.compile(r"\btempfile\.mktemp\s*\("), "tempfile.mktemp() has a race condition; use tempfile.mkstemp()."),
    (re.compile(r"\bhashlib\.new\s*\(\s*[\"'](?:md5|sha1|md4)[\"']", re.IGNORECASE), "hashlib.new() with MD5/SHA-1 uses a broken hash; pass 'sha256' instead."),
    (re.compile(r"\b(?:render_template_string|Template)\s*\(", ), "Rendering templates from user input enables server-side template injection (SSTI); render static templates with escaped variables."),
    (re.compile(r"\bmark_safe\s*\("), "mark_safe() disables auto-escaping and can introduce XSS; escape the value or sanitise it first."),
    (re.compile(r"\bjwt\.decode\s*\([^)]*verify\s*=\s*False"), "Decoding a JWT with verify=False skips signature checks; always verify the signature."),
    (re.compile(r"\bssl\._create_unverified_context\s*\("), "_create_unverified_context disables certificate validation; use a default verified context."),
    (re.compile(r"\bDES\b|\bARC4\b|\bBlowfish\b|\bRC4\b"), "DES/RC4/Blowfish are weak ciphers; use AES-GCM or ChaCha20-Poly1305."),
    (re.compile(r"f[\"'][^\"']*(?:SELECT|INSERT|UPDATE|DELETE)[^\"']*\{", re.IGNORECASE), "String-formatted SQL enables injection; use parameterised queries with placeholders."),
    (re.compile(r"(?i)(?:SELECT|INSERT|UPDATE|DELETE)\b[^\"';]*[\"']\s*(?:%|\.format\s*\(|\+)"), "Building SQL by string formatting/concatenation enables injection; use parameterised queries."),
    (re.compile(r"\bassert\s+.+,\s*[\"']"), "assert statements are stripped when Python runs with -O; do not use them for security checks or validation."),
    (re.compile(r"\brequest\.\w+\.get\([^)]*\)\s*(?:%|\+|\.format)"), "User input flows into a string operation without sanitisation; validate and escape it."),
    (re.compile(r"http://(?!localhost|127\.0\.0\.1)"), "Unencrypted HTTP transmits data in plaintext; prefer HTTPS where the endpoint supports it."),
]

JS_ADVISORIES = [
    (re.compile(r"\binnerHTML\s*[+]?="), "Assigning to innerHTML can introduce XSS; prefer textContent or sanitise with DOMPurify."),
    (re.compile(r"\bouterHTML\s*[+]?="), "Assigning to outerHTML can introduce XSS; build DOM nodes or sanitise with DOMPurify."),
    (re.compile(r"\bdocument\.write\s*\("), "document.write enables XSS; build DOM nodes instead."),
    (re.compile(r"\beval\s*\("), "eval() executes arbitrary JavaScript; use JSON.parse for data or a safe alternative."),
    (re.compile(r"\bnew\s+Function\s*\("), "new Function() behaves like eval(); avoid constructing code from strings."),
    (re.compile(r"\bset(?:Timeout|Interval)\s*\(\s*[\"'`]"), "Passing a string to setTimeout/setInterval runs it like eval(); pass a function instead."),
    (re.compile(r"\bchild_process\b|\brequire\(['\"]child_process['\"]\)"), "child_process.exec with interpolated input enables command injection; use execFile with an argument array."),
    (re.compile(r"\bMath\.random\s*\("), "Math.random is not cryptographically secure; use crypto.getRandomValues."),
    (re.compile(r"createHash\(\s*['\"](?:md5|sha1)['\"]", re.IGNORECASE), "MD5/SHA-1 are broken hashes; use 'sha256' instead."),
    (re.compile(r"dangerouslySetInnerHTML"), "dangerouslySetInnerHTML bypasses React's XSS protection; sanitise input with DOMPurify first."),
    (re.compile(r"\.html\s*\(\s*[^)]*(?:\+|\$\{|`)"), "Injecting dynamic strings via .html() (jQuery) enables XSS; use .text() or sanitise first."),
    (re.compile(r"(?i)(?:query|execute)\s*\(\s*[`\"'][^`\"']*(?:SELECT|INSERT|UPDATE|DELETE)[^`\"']*\$\{"), "Interpolating values into SQL enables injection; use parameterised queries."),
    (re.compile(r"http://(?!localhost|127\.0\.0\.1)"), "Unencrypted HTTP in code; prefer HTTPS."),
]

SECRET_PATTERNS = [
    (re.compile(r'(?i)(?:password|passwd|pwd)\s*=\s*["\'][^"\']{8,}["\']'), "Hardcoded password detected — move it to an environment variable."),
    (re.compile(r'(?i)(?:api_key|apikey|secret_key|secret|auth_token|access_token)\s*=\s*["\'][a-zA-Z0-9+/=_\-]{16,}["\']'), "Hardcoded API key/secret detected — move it to an environment variable."),
    (re.compile(r"(?:AKIA|ASIA)[A-Z0-9]{16}"), "AWS Access Key ID pattern detected — never hardcode AWS credentials."),
    (re.compile(r"AIza[0-9A-Za-z\-_]{35}"), "Google API key pattern detected — never hardcode credentials."),
    (re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}"), "GitHub token pattern detected — revoke it and load from a secret store."),
    (re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"), "Slack token pattern detected — revoke it and load from a secret store."),
    (re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----"), "Embedded private key detected — load it from a secret store, never commit it."),
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
            return tokenizer.decode(outputs[0], skip_special_tokens=True)
        outputs = model.generate(**inputs, max_new_tokens=200, do_sample=True, temperature=0.3, top_p=0.95)
    # Causal models echo the prompt back; keep only the newly generated tokens.
    generated = outputs[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(generated, skip_special_tokens=True)


def _postprocess(code: str):
    code = re.sub(r'^"""|"""$', "", code.strip())
    return "\n".join(l.replace("\t", "    ").rstrip() for l in code.splitlines())


def _candidate_ok(text: str, language: str) -> bool:
    """Guard against meaningless model output — never surface junk as a suggestion.

    A candidate must be non-trivial, must not be a leftover prompt echo, and
    (for Python) must actually parse as valid code.
    """
    if not text or len(text.strip()) < 20:
        return False
    if "fix security issues in this" in text.lower():
        return False
    if language == "python":
        try:
            compile(text, "<candidate>", "exec")
        except (SyntaxError, ValueError):
            return False
    return True


# ----------------------------------------------------------------------------
# Public API
# ----------------------------------------------------------------------------
def enhance_code(code: str, language: str, engine: str = "deterministic", llm: dict = None):
    """Enhance code.

    engine:
      * "deterministic" (default) — AST rewrites + advisories only. Always safe.
      * "ai" — additionally run the user's chosen hosted LLM (config in `llm`),
        with the deterministic result kept as a guaranteed-valid fallback.
    llm: {"provider", "api_key", "model", "base_url"} — supplied per request,
         never stored. Ignored unless engine == "ai".
    """
    language = (language or "python").lower()
    engine = (engine or "deterministic").lower()

    if len(code) > MAX_CODE_CHARS:
        return {
            "enhanced_code": code,
            "diff": [],
            "candidates": [],
            "explanations": [{
                "change": "Input too large",
                "reason": f"Code exceeds the {MAX_CODE_CHARS} character limit. Please split it into smaller files.",
            }],
            "engine_used": "none",
        }

    # Authoritative deterministic result — always computed.
    if language == "python":
        patched, explanations = ast_patch_python(code)
    else:
        patched, explanations = code, []

    explanations = explanations + advisory_scan(code, language)

    candidates = [{"model": "Secure fix (deterministic)", "code": patched}]
    primary_code = patched
    engine_used = "deterministic"

    # AI engine: run the user's provider and prefer its result when it's valid.
    if engine == "ai" and llm:
        try:
            from llm import call_llm
            ai_out = call_llm(
                llm.get("provider", ""),
                api_key=llm.get("api_key", ""),
                model=llm.get("model", ""),
                code=code,
                language=language,
                base_url=llm.get("base_url", ""),
            )
            if _candidate_ok(ai_out, language):
                label = f"AI · {llm.get('provider', 'model')}"
                candidates.insert(0, {"model": label, "code": ai_out})
                primary_code = ai_out
                engine_used = "ai"
                explanations.insert(0, {
                    "change": "AI rewrite",
                    "reason": f"Rewritten by {llm.get('provider', 'the selected model')}. The deterministic fix is kept as a fallback candidate.",
                })
            else:
                explanations.insert(0, {
                    "change": "AI output rejected",
                    "reason": "The model returned invalid or trivial code, so the deterministic fix is shown instead.",
                })
        except Exception as e:
            print(f"[llm] API call failed: {e}")
            explanations.insert(0, {
                "change": "AI unavailable",
                "reason": "The AI provider could not be reached, so the deterministic fix is shown instead.",
            })

    if not explanations:
        explanations = [{"change": "No issues found", "reason": "No known insecure patterns were detected."}]

    return {
        "enhanced_code": primary_code,
        "diff": create_diff(code, primary_code),
        "candidates": candidates[:3],
        "explanations": explanations,
        "engine_used": engine_used,
    }


# Optional local Transformers models are still supported behind ENABLE_MODELS,
# but are no longer wired into enhance_code by default. See git history / the
# `_run_model` helper below if you want to resurface them as candidates.
