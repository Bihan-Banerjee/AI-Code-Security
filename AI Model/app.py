from model import enhance_code

def get_user_code():
    print("Paste your insecure code (type 'END' on a new line to finish):\n")
    lines = []
    while True:
        try:
            line = input()
            if line.strip().upper() == "END":
                break
            lines.append(line)
        except EOFError:
            break
    return "\n".join(lines)

def main():
    print("AI Code Enhancer (Python & JavaScript)")
    language = input("Enter programming language (python/javascript): ").strip().lower()

    if language not in ["python", "javascript"]:
        print("Invalid language. Use 'python' or 'javascript'.")
        return

    insecure_code = get_user_code()

    if not insecure_code.strip():
        print("No code entered. Exiting.")
        return

    print("Analyzing your code...\n")

    enhanced_code, diff_output = enhance_code(insecure_code, language)

    print("Enhanced (Secure) Code:\n")
    print(enhanced_code)

    print("Differences (What was changed):\n")
    print(diff_output)

if __name__ == "__main__":
    main()
