from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import difflib

model_name = "Salesforce/codet5-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

def enhance_code(code: str, language: str):
    """
    Accepts insecure code and the language, returns enhanced code and diff.
    """
    prefix = f"fix {language} code: "
    input_text = prefix + code

    inputs = tokenizer.encode(input_text, return_tensors="pt", truncation=True, max_length=512)
    outputs = model.generate(inputs, max_length=512, num_beams=4, early_stopping=True)
    enhanced_code = tokenizer.decode(outputs[0], skip_special_tokens=True)

    diff = difflib.unified_diff(
        code.splitlines(),
        enhanced_code.splitlines(),
        fromfile="Insecure Code",
        tofile="Enhanced Code",
        lineterm=""
    )

    return enhanced_code, '\n'.join(diff)