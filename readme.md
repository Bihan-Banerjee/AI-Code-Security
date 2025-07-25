# Security Implications of AI-Generated Code  
## A Cross-Model Vulnerability Analysis

This repository supports the formal research paper exploring the security posture of code generated by modern AI coding assistants. Our work involves evaluating and comparing code samples from different models, identifying common vulnerability patterns, and proposing mitigation strategies.

---

## Objectives

- To evaluate the **security reliability** of AI-generated source code across multiple AI models.
- To identify **common vulnerability classes** in generated code.
- To assess the effectiveness of modern static analysis and security tools when applied to AI-generated code.
- To provide structured findings for academic and practical reference.
---

## AI Models Evaluated

- ChatGPT (OpenAI)
- GitHub Copilot
- Claude (Anthropic)
- Gemini (Google)
- DeepSeek
- Grok

---

## Languages and Code Samples

| Model     | Java | Python | JavaScript |
|-----------|------|--------|------------|
| ChatGPT   | ✅   | ✅     | ✅         |
| Copilot   | ✅   | ✅     | ✅         |
| Claude    | ✅   | ✅     | ✅         |
| Gemini    | ✅   | ✅     | ✅         |
| DeepSeek  | ✅   | ✅     | ✅         |
| Grok      | ✅   | ✅     | ✅         |

---

## Tools and Methodologies

| Category             | Tools Used                          |
|----------------------|-------------------------------------|
| Static Analysis      | Semgrep, SonarLint, SpotBugs        |
| Secret Scanning      | TruffleHog, GitLeaks                |
| Dependency Analysis  | OWASP Dependency Check              |
| Runtime Testing (Optional) | Burp Suite                   |

---


## Getting Started

### Clone the repository:
```bash
git clone https://github.com/<your-org>/ai-code-security-study.git
cd ai-code-security-study

License
This work is intended for academic use. Please cite appropriately if used in derivative work.

