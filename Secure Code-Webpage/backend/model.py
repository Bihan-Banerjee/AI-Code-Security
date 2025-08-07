from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import difflib
import re

model_name = "Salesforce/codet5-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

def enhance_code(code: str, language: str):
 
    prefix = f"fix {language} code: "
    input_text = prefix + code

    inputs = tokenizer.encode(input_text, return_tensors="pt", truncation=True, max_length=512)
    outputs = model.generate(inputs, max_length=512, num_beams=4, early_stopping=True)

    enhanced_code = tokenizer.decode(outputs[0], skip_special_tokens=True, clean_up_tokenization_spaces=False)

    enhanced_code = postprocess_code(enhanced_code)


    diff = difflib.unified_diff(
        code.splitlines(),
        enhanced_code.splitlines(),
        fromfile="insecure_code.py",
        tofile="enhanced_code.py",
        lineterm=""
    )

    clean_diff = []
    for line in diff:
        if line.startswith('+') and not line.startswith('+++'):
            clean_diff.append(line[1:].lstrip())
        elif line.startswith('-') and not line.startswith('---'):
            clean_diff.append(line[1:].lstrip())

    return enhanced_code, '\n'.join(clean_diff)

def postprocess_code(code: str):
    
    code = re.sub(r'^"""|"""$', '', code.strip())

    lines = code.splitlines()
    fixed_lines = []
    for line in lines:
        line = line.replace('\t', '    ') 
        line = line.rstrip() 
        fixed_lines.append(line)

    return '\n'.join(fixed_lines)