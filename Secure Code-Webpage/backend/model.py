import torch
import difflib
import re
from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM
)
import os

torch.set_num_threads(max(1, os.cpu_count() // 2))
DEVICE = "cpu"

MAX_CODE_CHARS = 8000

MODEL_CONFIGS = {
    "Salesforce/codet5-base": "seq2seq",        # CodeT5
    #"EleutherAI/gpt-neo-1.3B": "causal",        # GPT-Neo (disabled due to free hosting)
    "microsoft/CodeGPT-small-py": "causal",     # CodeGPT-small (Python)
}

tokenizers = {}
models = {}

def load_models():
    for name, mtype in MODEL_CONFIGS.items():
        print(f"Loading {name} ...")

        tokenizers[name] = AutoTokenizer.from_pretrained(name, use_fast=False)

        if mtype == "seq2seq":
            model = AutoModelForSeq2SeqLM.from_pretrained(name)
        else:
            model = AutoModelForCausalLM.from_pretrained(name)

        model.to(DEVICE)
        model.eval()
        models[name] = model
        print("✅ All models loaded")

print("🔹 Loading models...")
if __name__ != "__main__" or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    load_models()

SECURE_REPLACEMENTS = {
    # Weak hashing
    "hashlib.md5":          ("hashlib.sha256",        "MD5 is cryptographically broken; replaced with SHA-256."),
    "hashlib.sha1":         ("hashlib.sha256",        "SHA-1 is deprecated for security use; replaced with SHA-256."),
    # Dangerous execution
    "eval(":                ("ast.literal_eval(",     "eval() executes arbitrary code; use ast.literal_eval for safe parsing."),
    "exec(":                ("# exec() removed —",    "exec() executes arbitrary code strings; remove or sandbox."),
    # Insecure deserialization
    "pickle.load(":         ("# pickle.load UNSAFE —","pickle.load deserialises arbitrary objects; use json or safer alternatives."),
    "pickle.loads(":        ("# pickle.loads UNSAFE —","pickle.loads is an RCE risk; use json.loads instead."),
    "yaml.load(":           ("yaml.safe_load(",       "yaml.load with arbitrary loader executes code; use yaml.safe_load."),
    # Command injection
    "os.system(":           ("subprocess.run([",      "os.system passes args to the shell; use subprocess.run with a list to avoid injection."),
    "shell=True":           ("shell=False",           "shell=True enables command injection; pass args as a list with shell=False."),
    # Insecure temp files
    "tempfile.mktemp(":     ("tempfile.mkstemp(",     "mktemp() has a race condition; use mkstemp() which atomically creates the file."),
    # Weak randomness
    "random.random()":      ("secrets.token_bytes(16)","random is not cryptographically secure; use the secrets module for security-sensitive values."),
    "random.randint(":      ("secrets.randbelow(",    "random.randint is not cryptographically secure; use secrets.randbelow for security tokens."),
    # Insecure TLS
    "verify=False":         ("verify=True",           "Disabling TLS verification allows MITM attacks; always verify certificates."),
    "ssl.CERT_NONE":        ("ssl.CERT_REQUIRED",     "ssl.CERT_NONE disables certificate validation entirely; use ssl.CERT_REQUIRED."),
    # Debug/info leakage
    "DEBUG = True":         ("DEBUG = False",         "Debug mode exposes stack traces and internal config; disable in production."),
    "app.run(debug=True":   ("app.run(debug=False",   "Flask debug=True enables the Werkzeug debugger which allows arbitrary code execution."),
}

PYTHON_EXTRA_REPLACEMENTS = {
    # SQL injection helpers
    "% username":           ("# Use parameterised query","String-formatted SQL allows injection; use parameterised queries with ? placeholders."),
    "format(username":      ("# Use parameterised query","String-formatted SQL allows injection; use parameterised queries."),
    # Insecure HTTP
    "http://":              ("https://",              "Unencrypted HTTP transmits data in plaintext; upgrade to HTTPS."),
}

JS_SECURE_REPLACEMENTS = {
    "innerHTML =":              ("textContent =",             "innerHTML enables XSS; use textContent to safely set plain text."),
    "innerHTML+=":              ("textContent+=",             "innerHTML enables XSS; use textContent instead."),
    "document.write(":          ("// document.write removed —","document.write allows XSS injection; use DOM APIs instead."),
    "eval(":                    ("JSON.parse(",               "eval() executes arbitrary JavaScript; use JSON.parse for data or a safe alternative."),
    "Math.random()":            ("crypto.getRandomValues(",   "Math.random is not cryptographically secure; use crypto.getRandomValues."),
    "http://":                  ("https://",                  "Unencrypted HTTP in JS code; upgrade to HTTPS."),
    "dangerouslySetInnerHTML":  ("// dangerouslySetInnerHTML — review needed","dangerouslySetInnerHTML bypasses React's XSS protection; sanitise input with DOMPurify first."),
    "localStorage.setItem":     ("// Consider sessionStorage —","localStorage persists indefinitely; prefer sessionStorage for sensitive session data."),
}

SECRET_PATTERNS = [
    (
        r'(?i)(?:password|passwd|pwd)\s*=\s*["\'][^"\']{8,}["\']',
        "Hardcoded password detected — move to an environment variable."
    ),
    (
        r'(?i)(?:api_key|apikey|secret_key|secret|auth_token)\s*=\s*["\'][a-zA-Z0-9+/=_\-]{16,}["\']',
        "Hardcoded API key or secret detected — move to an environment variable."
    ),
    (
        r'(?:AKIA|ASIA)[A-Z0-9]{16}',
        "AWS Access Key ID pattern detected — never hardcode AWS credentials."
    ),
    (
        r'(?i)private_key\s*=\s*["\'][^"\']{10,}["\']',
        "Hardcoded private key detected — load from a secure vault or environment variable."
    ),
]

def scan_secrets(code: str) -> list:
    """Detect hardcoded secrets via regex and return explanation entries."""
    findings = []
    for pattern, reason in SECRET_PATTERNS:
        for match in re.finditer(pattern, code):
            snippet = match.group()[:60]
            findings.append({
                "change": f"Hardcoded secret: {snippet}{'...' if len(match.group()) > 60 else ''}",
                "reason": reason
            })
    return findings

def rule_based_patch(code: str, language: str = "python"):
    explanations = []
    patched = code

    for bad, (good, reason) in SECURE_REPLACEMENTS.items():
        if bad in patched:
            patched = patched.replace(bad, good)
            explanations.append({
                "change": f"{bad} → {good}",
                "reason": reason
            })

    lang_rules = JS_SECURE_REPLACEMENTS if language == "javascript" else PYTHON_EXTRA_REPLACEMENTS
    for bad, (good, reason) in lang_rules.items():
        if bad in patched:
            patched = patched.replace(bad, good)
            explanations.append({
                "change": f"{bad} → {good}",
                "reason": reason
            })

    secret_findings = scan_secrets(code)
    explanations.extend(secret_findings)

    return patched, explanations

def preserve_structure(original: str, enhanced: str):
    final_code = enhanced

    original_imports = [
        l for l in original.splitlines()
        if l.strip().startswith(("import ", "from "))
    ]

    for imp in original_imports:
        if imp not in final_code:
            final_code = imp + "\n" + final_code

    original_defs = [
        l for l in original.splitlines()
        if l.strip().startswith("def ")
    ]

    for d in original_defs:
        if d.split("(")[0] not in final_code:
            final_code = (
                d +
                "\n    # [!] Function body missing, please review\n" +
                final_code
            )

    return final_code

def create_diff(original: str, enhanced: str):
    diff_lines = difflib.unified_diff(
        original.splitlines(),
        enhanced.splitlines(),
        lineterm=""
    )

    formatted = []

    for line in diff_lines:
        if line.startswith("+") and not line.startswith("+++"):
            formatted.append({
                "type": "add",
                "content": line[1:]
            })
        elif line.startswith("-") and not line.startswith("---"):
            formatted.append({
                "type": "remove",
                "content": line[1:]
            })
        elif not line.startswith("@@"):
            formatted.append({
                "type": "context",
                "content": line
            })

    return formatted

def postprocess_code(code: str):
    code = re.sub(r'^"""|"""$', '', code.strip())
    lines = code.splitlines()
    return "\n".join(
        l.replace("\t", "    ").rstrip()
        for l in lines
    )

def score_candidate(candidate_code: str, original_code: str) -> int:
    """
    Score a candidate by how many known bad patterns it fixed
    minus any new bad patterns it introduced.
    Failed/crashed candidates are heavily penalised.
    """
    if "# [!] Failed" in candidate_code[:80]:
        return -9999

    all_bad = (
        list(SECURE_REPLACEMENTS.keys()) +
        list(PYTHON_EXTRA_REPLACEMENTS.keys()) +
        list(JS_SECURE_REPLACEMENTS.keys())
    )
    fixed = sum(1 for p in all_bad if p in original_code and p not in candidate_code)
    new_issues = sum(1 for p in all_bad if p not in original_code and p in candidate_code)
    return fixed - new_issues

def run_model(model_name, code, language):
    tokenizer = tokenizers[model_name]
    model = models[model_name]
    mtype = MODEL_CONFIGS[model_name]

    prompt = f"Fix security issues in this {language} code:\n{code}"

    if mtype == "seq2seq":
        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(DEVICE)

        outputs = model.generate(
            **inputs,
            max_new_tokens=512,
            num_beams=4
        )
    else:
        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(DEVICE)

        outputs = model.generate(
            **inputs,
            max_new_tokens=256,
            temperature=0.3,
            top_p=0.95,
            do_sample=True
        )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)

def enhance_code(code: str, language: str):

    if len(code) > MAX_CODE_CHARS:
        return {
            "enhanced_code": code,
            "diff": [],
            "candidates": [],
            "explanations": [{
                "change": "Input too large",
                "reason": f"Code exceeds {MAX_CODE_CHARS} character limit. Please split into smaller files."
            }]
        }

    with torch.no_grad():
        try:
            patched_code, rule_explanations = rule_based_patch(code, language)

            candidates = []

            for m in MODEL_CONFIGS.keys():
                try:
                    enhanced = run_model(m, patched_code, language)
                    enhanced = postprocess_code(enhanced)
                    enhanced = preserve_structure(code, enhanced)

                    candidates.append({
                        "model": m,
                        "code": enhanced
                    })

                except Exception as e:
                    candidates.append({
                        "model": m,
                        "code": f"# [!] Failed: {str(e)}"
                    })

            valid_candidates = [c for c in candidates if "# [!] Failed" not in c["code"][:80]]
            if valid_candidates:
                best = max(valid_candidates, key=lambda c: score_candidate(c["code"], code))
            else:
                best = {"model": "rule-based", "code": patched_code}

            diff = create_diff(code, best["code"])

            explanations = rule_explanations + [{
                "change": "Model ensemble",
                "reason": "Best candidate selected from multiple models based on security improvement score"
            }]

            return {
                "enhanced_code": best["code"],
                "diff": diff,
                "candidates": candidates[:3],
                "explanations": explanations
            }

        except Exception as e:
            fallback = code + f"\n# [!] Enhancer crashed: {str(e)}"

            return {
                "enhanced_code": fallback,
                "diff": create_diff(code, fallback),
                "candidates": [],
                "explanations": [{
                    "change": "Error",
                    "reason": str(e)
                }]
            }