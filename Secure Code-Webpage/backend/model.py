from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM
)
import difflib, re, torch

# Models and their types
MODEL_CONFIGS = {
    "Salesforce/codet5-base": "seq2seq",        # CodeT5
    "EleutherAI/gpt-neo-1.3B": "causal",        # GPT-Neo
    "microsoft/CodeGPT-small-py": "causal",     # CodeGPT-small (Python)
}

# Load tokenizers and models
tokenizers, models = {}, {}

for name, mtype in MODEL_CONFIGS.items():
    tokenizers[name] = AutoTokenizer.from_pretrained(name)
    if mtype == "seq2seq":
        models[name] = AutoModelForSeq2SeqLM.from_pretrained(name)
    else:
        models[name] = AutoModelForCausalLM.from_pretrained(name)

# Rule-based fixes
SECURE_REPLACEMENTS = {
    "hashlib.md5": ("hashlib.sha256", "MD5 is weak, replaced with SHA-256."),
    "hashlib.sha1": ("hashlib.sha256", "SHA1 is weak, replaced with SHA-256."),
    "eval(": ("ast.literal_eval(", "Unsafe eval removed, replaced with safe literal_eval."),
    "pickle.load(": ("# pickle.load removed", "pickle.load is unsafe, consider json/safe loaders."),
}

def rule_based_patch(code: str):
    explanations = []
    patched = code
    for bad, (good, reason) in SECURE_REPLACEMENTS.items():
        if bad in patched:
            patched = patched.replace(bad, good)
            explanations.append({"change": f"{bad} → {good}", "reason": reason})
    return patched, explanations

def preserve_structure(original: str, enhanced: str):
    """Ensure imports and function signatures remain if model drops them."""
    final_code = enhanced
    original_imports = [l for l in original.splitlines() if l.strip().startswith("import")]
    for imp in original_imports:
        if imp not in final_code:
            final_code = imp + "\n" + final_code
    original_defs = [l for l in original.splitlines() if l.strip().startswith("def ")]
    for d in original_defs:
        if d.split("(")[0] not in final_code:
            final_code = d + "\n    # [!] Function body missing, please review\n" + final_code
    return final_code

def create_diff(original: str, enhanced: str):
    """Return structured diff for frontend rendering."""
    diff_lines = difflib.unified_diff(
        original.splitlines(), enhanced.splitlines(),
        fromfile="Original", tofile="Enhanced", lineterm=""
    )
    formatted = []
    for line in diff_lines:
        if line.startswith("+") and not line.startswith("+++"):
            formatted.append({"type": "add", "content": line[1:]})
        elif line.startswith("-") and not line.startswith("---"):
            formatted.append({"type": "remove", "content": line[1:]})
        elif not line.startswith("@@"):
            formatted.append({"type": "context", "content": line})
    return formatted

def postprocess_code(code: str):
    code = re.sub(r'^"""|"""$', '', code.strip())
    lines = code.splitlines()
    return "\n".join([l.replace("\t", "    ").rstrip() for l in lines])

def run_model(model_name, code, language):
    tokenizer = tokenizers[model_name]
    model = models[model_name]
    mtype = MODEL_CONFIGS[model_name]

    prompt = f"fix {language} code: {code}"

    if mtype == "seq2seq":
        inputs = tokenizer.encode(prompt, return_tensors="pt", truncation=True, max_length=512)
        outputs = model.generate(inputs, max_length=512, num_beams=4, early_stopping=True)
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
    else:
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        outputs = model.generate(
            **inputs,
            max_new_tokens=256,
            temperature=0.3,
            top_p=0.95,
            do_sample=False
        )
        return tokenizer.decode(outputs[0], skip_special_tokens=True)

def enhance_code(code: str, language: str):
    try:
        patched_code, rule_explanations = rule_based_patch(code)

        candidates = []
        for m in MODEL_CONFIGS.keys():
            try:
                enhanced = run_model(m, patched_code, language)
                enhanced = postprocess_code(enhanced)
                enhanced = preserve_structure(code, enhanced)
                candidates.append({"model": m, "code": enhanced})
            except Exception as e:
                candidates.append({"model": m, "code": f"# [!] Failed: {str(e)}"})

        best = max(candidates, key=lambda c: len(c["code"]))
        diff = create_diff(code, best["code"])

        explanations = rule_explanations + [
            {"change": "Model improvements", "reason": "Best candidate chosen among ensemble"}
        ]

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
            "explanations": [{"change": "Error", "reason": str(e)}]
        }
