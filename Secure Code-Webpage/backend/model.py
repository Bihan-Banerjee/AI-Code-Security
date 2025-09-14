from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import difflib
import re

model_name = "Salesforce/codet5-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

SECURE_REPLACEMENTS = {
    "hashlib.md5": "hashlib.sha256",
    "hashlib.sha1": "hashlib.sha256",
    "eval(": "# [!] Removed unsafe eval, use ast.literal_eval instead",
    "pickle.load(": "# [!] Unsafe pickle.load detected, consider json or safe loaders",
}

def rule_based_patch(code: str) -> str:
    patched = code
    for bad, good in SECURE_REPLACEMENTS.items():
        if bad in patched:
            patched = patched.replace(bad, good)
    return patched

def preserve_structure(original: str, enhanced: str) -> str:
    """
    Ensure function signatures and imports from the original code remain
    if the model accidentally strips them.
    """
    final_code = enhanced

    original_imports = [line for line in original.splitlines() if line.strip().startswith("import")]
    for imp in original_imports:
        if imp not in final_code:
            final_code = imp + "\n" + final_code

    original_defs = [line for line in original.splitlines() if line.strip().startswith("def ")]
    for d in original_defs:
        if d.split("(")[0] not in final_code:  
            final_code = d + "\n    # [!] Function body missing, please review\n" + final_code

    return final_code

def create_diff(original: str, enhanced: str):
    """
    Return structured diff for frontend rendering.
    """
    diff_lines = difflib.unified_diff(
        original.splitlines(),
        enhanced.splitlines(),
        fromfile="Original",
        tofile="Enhanced",
        lineterm=""
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

def postprocess_code(code: str) -> str:
    code = re.sub(r'^"""|"""$', '', code.strip())
    lines = code.splitlines()
    fixed_lines = [line.replace('\t', '    ').rstrip() for line in lines]
    return '\n'.join(fixed_lines)

def enhance_code(code: str, language: str):
    try:
        patched_code = rule_based_patch(code)

        prefix = f"fix {language} code: "
        input_text = prefix + patched_code
        inputs = tokenizer.encode(input_text, return_tensors="pt", truncation=True, max_length=512)

        outputs = model.generate(inputs, max_length=512, num_beams=4, early_stopping=True)
        enhanced_code = tokenizer.decode(outputs[0], skip_special_tokens=True, clean_up_tokenization_spaces=False)
        enhanced_code = postprocess_code(enhanced_code)

        # preserve imports and function defs
        enhanced_code = preserve_structure(code, enhanced_code)

        if not enhanced_code.strip():
            enhanced_code = patched_code + "\n# [!] Enhancer failed, rule-based patch only applied."

        diff = create_diff(code, enhanced_code)
        return enhanced_code, diff

    except Exception as e:
        fallback = code + f"\n# [!] Enhancer crashed: {str(e)}"
        return fallback, create_diff(code, fallback)
