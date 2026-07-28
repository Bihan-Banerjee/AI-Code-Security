"""Provider-agnostic hosted-LLM client for the enhancer's optional "AI" engine.

Keys are supplied per-request by the user (never stored server-side). Supports
OpenAI-compatible providers (OpenAI, DeepSeek, OpenRouter, Ollama), Anthropic,
and Google Gemini. Every call is best-effort; failures raise so the caller can
fall back to the deterministic engine.
"""
import re

DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-haiku-4-5-20251001",
    "deepseek": "deepseek-chat",
    "openrouter": "openai/gpt-4o-mini",
    "gemini": "gemini-1.5-flash",
    "ollama": "llama3.2",
}

# Providers that speak the OpenAI /chat/completions dialect.
_OPENAI_BASE = {
    "openai": "https://api.openai.com/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
}

SUPPORTED = set(DEFAULT_MODELS)


def _system_prompt(language: str) -> str:
    return (
        f"You are a secure-coding assistant. Rewrite the following {language} code "
        "to fix every security vulnerability while preserving its behaviour. Return "
        "ONLY the corrected code, with no explanations, no commentary, and no "
        "markdown code fences."
    )


def strip_code_fences(text: str) -> str:
    text = (text or "").strip()
    fenced = re.match(r"^```[A-Za-z0-9_+-]*\n(.*)\n?```$", text, re.DOTALL)
    if fenced:
        return fenced.group(1).strip()
    text = re.sub(r"^```[A-Za-z0-9_+-]*\n?", "", text)
    text = re.sub(r"\n?```$", "", text)
    return text.strip()


def _ollama_base(base_url: str) -> str:
    base = (base_url or "http://localhost:11434/v1").strip().rstrip("/")
    if not re.match(r"^https?://", base):
        raise ValueError("Ollama base URL must start with http:// or https://")
    if not base.endswith("/v1"):
        base = base + "/v1"
    return base


def _openai_chat(base, api_key, model, system, user, max_tokens, timeout, referer=None):
    import requests

    headers = {"content-type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    if referer:  # OpenRouter likes these; harmless elsewhere.
        headers["HTTP-Referer"] = referer
        headers["X-Title"] = "FortiScan"
    resp = requests.post(
        f"{base}/chat/completions",
        headers=headers,
        json={
            "model": model,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _anthropic(api_key, model, system, user, max_tokens, timeout):
    import requests

    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def _gemini(api_key, model, system, user, max_tokens, timeout):
    import requests

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    resp = requests.post(
        url,
        headers={"content-type": "application/json", "x-goog-api-key": api_key},
        json={
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": user}]}],
            "generationConfig": {"maxOutputTokens": max_tokens},
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def call_llm(provider, api_key="", model="", code="", language="python",
             base_url="", max_tokens=2048, timeout=45):
    """Return the LLM's rewritten code (fences stripped). Raises on failure."""
    provider = (provider or "").strip().lower()
    if provider not in SUPPORTED:
        raise ValueError(f"Unsupported provider: {provider!r}")
    model = (model or "").strip() or DEFAULT_MODELS[provider]
    system = _system_prompt(language)

    if provider in _OPENAI_BASE:
        referer = "https://fortiscan.app" if provider == "openrouter" else None
        text = _openai_chat(_OPENAI_BASE[provider], api_key, model, system, code,
                            max_tokens, timeout, referer=referer)
    elif provider == "ollama":
        text = _openai_chat(_ollama_base(base_url), "", model, system, code, max_tokens, timeout)
    elif provider == "anthropic":
        text = _anthropic(api_key, model, system, code, max_tokens, timeout)
    elif provider == "gemini":
        text = _gemini(api_key, model, system, code, max_tokens, timeout)
    else:  # pragma: no cover - guarded above
        raise ValueError(f"Unsupported provider: {provider!r}")

    return strip_code_fences(text)


def test_llm(provider, api_key="", model="", base_url="", timeout=15):
    """Live connectivity/auth check. Returns (ok: bool, message: str)."""
    import requests

    provider = (provider or "").strip().lower()
    if provider not in SUPPORTED:
        return False, f"Unsupported provider: {provider}"
    if provider != "ollama" and not api_key:
        return False, "An API key is required for this provider."

    model = (model or "").strip() or DEFAULT_MODELS[provider]
    try:
        # Minimal generation verifies connectivity, auth, and model availability.
        call_llm(provider, api_key=api_key, model=model, code="print(1)",
                 language="python", base_url=base_url, max_tokens=16, timeout=timeout)
        return True, f"Connected — {provider} / {model} is live."
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else "?"
        detail = ""
        if e.response is not None:
            try:
                body = e.response.json()
                detail = (body.get("error", {}) or {}).get("message", "") if isinstance(body.get("error"), dict) else str(body.get("error", ""))
            except Exception:
                detail = e.response.text[:200]
        hint = " (check the API key)" if status in (401, 403) else " (check the model name)" if status == 404 else ""
        return False, f"HTTP {status}{hint}: {detail or 'request rejected'}"
    except requests.ConnectionError:
        return False, "Connection failed — is the endpoint reachable? (For Ollama, is it running?)"
    except requests.Timeout:
        return False, "Timed out contacting the provider."
    except Exception as e:
        return False, f"{e.__class__.__name__}: {e}"
