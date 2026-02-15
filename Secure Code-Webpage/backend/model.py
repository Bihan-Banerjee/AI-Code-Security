import torch
import difflib
import re
from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM
)

# ----------------------------
# Performance Settings
# ----------------------------

torch.set_num_threads(2)
DEVICE = "cpu"  

# ----------------------------
# Models and their types
# ----------------------------

MODEL_CONFIGS = {
    "Salesforce/codet5-base": "seq2seq",        # CodeT5
    #"EleutherAI/gpt-neo-1.3B": "causal",        # GPT-Neo (disabled due to free hosting for now; enable on local hosting)
    "microsoft/CodeGPT-small-py": "causal",     # CodeGPT-small (Python)
}

# ----------------------------
# Load tokenizers and models
# ----------------------------

tokenizers = {}
models = {}

print("🔹 Loading models...")

for name, mtype in MODEL_CONFIGS.items():
    print(f"Loading {name} ...")

    tokenizers[name] = AutoTokenizer.from_pretrained(name)

    if mtype == "seq2seq":
        model = AutoModelForSeq2SeqLM.from_pretrained(name)
    else:
        model = AutoModelForCausalLM.from_pretrained(name)

    model.to(DEVICE)
    model.eval()          
    models[name] = model

print("✅ All models loaded")

# ----------------------------
# Rule-based fixes
# ----------------------------

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
            explanations.append({
                "change": f"{bad} → {good}",
                "reason": reason
            })

    return patched, explanations

# ----------------------------
# Structure preservation
# ----------------------------

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

# ----------------------------
# Diff creation
# ----------------------------

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

# ----------------------------
# Postprocess output
# ----------------------------

def postprocess_code(code: str):
    code = re.sub(r'^"""|"""$', '', code.strip())
    lines = code.splitlines()
    return "\n".join(
        l.replace("\t", "    ").rstrip()
        for l in lines
    )

# ----------------------------
# Run one model
# ----------------------------

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
            do_sample=False
        )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)

# ----------------------------
# Main enhancer
# ----------------------------

def enhance_code(code: str, language: str):

    with torch.no_grad():

        try:
            # 1️⃣ Rule-based fixes
            patched_code, rule_explanations = rule_based_patch(code)

            # 2️⃣ Model ensemble
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

            # 3️⃣ Choose longest output as best
            best = max(candidates, key=lambda c: len(c["code"]))

            diff = create_diff(code, best["code"])

            explanations = rule_explanations + [{
                "change": "Model ensemble",
                "reason": "Best candidate selected from multiple models"
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
