import shutil
print("Scanner path:", shutil.which("sonar-scanner"))
"""
scan_all.py
-----------
Walks the "LLM Code Snippets" directory tree and runs Semgrep, Bandit
(Python only), and SonarQube against every code file it finds.

Directory layout (scripts/ and results/ live INSIDE LLM Code Snippets/):
    LLM Code Snippets/
        ChatGPT/
            JS/
                Task 3/
                    standard.js
                    secure.js
            Python/
                Task 3/ ...
        Claude/ ...
        results/          ← raw JSON and CSV output goes here
            raw/
            csv/
        scripts/
            scan_all.py   ← this file

Condition is detected automatically from the filename:
    - contains 'standard' or 'a_standard'  → A_standard
    - contains 'secure'   or 'b_secure'    → B_secure
    - neither (only one file in folder)    → A_standard (assumed baseline)
"""

import os
import json
import subprocess
import pathlib
import time
import urllib.request
import urllib.parse
import base64

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────
# scripts/ is one level inside LLM Code Snippets/, so parent.parent = LLM Code Snippets/
ROOT         = pathlib.Path(__file__).resolve().parent.parent
SNIPPETS_DIR = ROOT                        # ChatGPT/, Claude/, etc. live here
RAW_DIR      = ROOT / "results" / "raw"   # LLM Code Snippets/results/raw/

# Folders inside SNIPPETS_DIR that are NOT LLM snippet folders — skip them
SKIP_DIRS = {"results", "scripts", ".git", ".github", ".scannerwork"}

# SonarQube — fill in after: docker run -d -p 9000:9000 sonarqube:community
SONAR_URL     = "http://localhost:9000"
SONAR_TOKEN   = "sqa_4f6de144c4a095a5f729a122ce2530d342ab36d8"   # Admin → My Account → Security → Generate Token
SONAR_PROJECT = "fortiscan"
SONAR_WAIT_S  = 12   # seconds to wait after scanner finishes before API fetch
# ─────────────────────────────────────────────────────────────────────────────

VALID_EXTENSIONS = {".py", ".js"}


def detect_condition(filepath: pathlib.Path, siblings: list) -> str:
    """
    Work out whether a file is the 'standard' or 'secure' condition.
    Rules (in priority order):
      1. Filename contains 'b_secure' or just 'secure'  → B_secure
      2. Filename contains 'a_standard' or 'standard'   → A_standard
      3. Only one file in the Task folder               → A_standard
      4. Two files: alphabetically first is A, second is B
    """
    name = filepath.stem.lower()
    if "b_secure" in name or name == "secure" or name.endswith("_secure"):
        return "B_secure"
    if "a_standard" in name or name == "standard" or name.endswith("_standard"):
        return "A_standard"
    if len(siblings) == 1:
        return "A_standard"
    sorted_sibs = sorted(siblings)
    return "A_standard" if filepath == sorted_sibs[0] else "B_secure"


def out_path_for(filepath: pathlib.Path, tool: str) -> pathlib.Path:
    """
    Mirror the snippet path under results/raw/ and append tool suffix.
    e.g.  LLM Code Snippets/ChatGPT/JS/Task 3/standard.js
          → LLM Code Snippets/results/raw/ChatGPT/JS/Task 3/standard_semgrep.json
    """
    rel = filepath.relative_to(SNIPPETS_DIR)
    out_dir = RAW_DIR / rel.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir / f"{rel.stem}_{tool}.json"


# ─────────────────────────────────────────────────────────────────────────────
# TOOL RUNNERS
# ─────────────────────────────────────────────────────────────────────────────

def run_bandit(filepath: pathlib.Path, out: pathlib.Path):
    """Bandit — Python only. Saves full JSON output."""
    result = subprocess.run(
        ["bandit", "-f", "json", "-ll", "--recursive", str(filepath)],
        capture_output=True, text=True
    )
    try:
        data = json.loads(result.stdout) if result.stdout.strip() else \
               {"results": [], "errors": [], "metrics": {}}
    except json.JSONDecodeError:
        data = {"results": [], "errors": [result.stdout[:500]], "metrics": {}}
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def run_semgrep(filepath: pathlib.Path, out: pathlib.Path):
    """Semgrep — runs the full 'auto' security ruleset."""
    result = subprocess.run(
        ["semgrep", "--config", "auto", "--json", "--quiet",
         "--no-git-ignore", str(filepath)],
        capture_output=True, text=True, encoding="utf-8", errors="ignore"
    )
    try:
        data = json.loads(result.stdout) if result.stdout.strip() else \
               {"results": [], "errors": []}
    except json.JSONDecodeError:
        data = {"results": [], "errors": [result.stdout[:500]]}
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def run_sonarqube(filepath: pathlib.Path, out: pathlib.Path):
    """
    SonarQube — copies snippet to a temp project, scans, fetches results.
    Requires sonar-scanner CLI on PATH.
    """
    import shutil, tempfile

    rel   = filepath.relative_to(SNIPPETS_DIR)
    parts = list(rel.parts)
    key   = "-".join(parts[:-1] + [filepath.stem]).lower()
    key   = key.replace(" ", "-").replace("_", "-")[:200]
    lang  = "py" if filepath.suffix == ".py" else "js"

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = pathlib.Path(tmpdir)
        shutil.copy(filepath, tmpdir / filepath.name)

        props = (
            f"sonar.projectKey={key}\n"
            f"sonar.projectName={key}\n"
            f"sonar.sources=.\n"
            f"sonar.language={lang}\n"
            f"sonar.host.url={SONAR_URL}\n"
            f"sonar.login={SONAR_TOKEN}\n"
            f"sonar.scm.disabled=true\n"
            f"sonar.sourceEncoding=UTF-8\n"
        )
        (tmpdir / "sonar-project.properties").write_text(props)

        subprocess.run(
            f"sonar-scanner -Dsonar.projectBaseDir={tmpdir}", shell=True,
            capture_output=True, text=True, cwd=str(tmpdir)
        )
        time.sleep(SONAR_WAIT_S)

        params = urllib.parse.urlencode({
            "componentKey": key,
            "resolved": "false",
            "ps": 500,
            "types": "BUG,VULNERABILITY,CODE_SMELL",
        })
        url = f"{SONAR_URL}/api/issues/search?{params}"
        req = urllib.request.Request(url)
        creds = base64.b64encode(f"{SONAR_TOKEN}:".encode()).decode()
        req.add_header("Authorization", f"Basic {creds}")

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
        except Exception as e:
            data = {"issues": [], "error": str(e)}

    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN SCAN LOOP
# ─────────────────────────────────────────────────────────────────────────────

def collect_files():
    """
    Walk the snippets directory, skipping non-LLM folders (results/, scripts/, etc.).
    Returns list of (filepath, llm, language, task_name, condition).
    """
    entries = []
    for llm_dir in sorted(SNIPPETS_DIR.iterdir()):
        # Skip non-LLM folders that also live in the root
        if not llm_dir.is_dir() or llm_dir.name in SKIP_DIRS:
            continue
        llm = llm_dir.name

        for lang_dir in sorted(llm_dir.iterdir()):
            if not lang_dir.is_dir():
                continue
            lang = lang_dir.name  # 'JS' or 'Python'

            for task_dir in sorted(lang_dir.iterdir()):
                if not task_dir.is_dir():
                    continue
                task_name = task_dir.name  # e.g. 'Task 3'

                code_files = [
                    f for f in sorted(task_dir.iterdir())
                    if f.is_file() and f.suffix in VALID_EXTENSIONS
                ]

                for filepath in code_files:
                    condition = detect_condition(filepath, code_files)
                    entries.append((filepath, llm, lang, task_name, condition))

    return entries


def scan_all():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    entries = collect_files()
    total   = len(entries)

    if total == 0:
        print(f"No files found under {SNIPPETS_DIR}")
        print(f"Skipping directories: {SKIP_DIRS}")
        print("Check that your Task folders contain .py or .js files.")
        return

    print(f"Snippets root : {SNIPPETS_DIR}")
    print(f"Results root  : {RAW_DIR}")
    print(f"Found {total} files to scan\n")

    for i, (filepath, llm, lang, task_name, condition) in enumerate(entries, 1):
        label = f"{llm}/{lang}/{task_name}/{filepath.name}"
        print(f"[{i:3d}/{total}] {label}")

        # ── Semgrep ──────────────────────────────────────────────────────────
        sg_out = out_path_for(filepath, "semgrep")
        if sg_out.exists():
            print("           semgrep (cached)")
        else:
            run_semgrep(filepath, sg_out)
            print("           semgrep ✓")

        # ── Bandit (Python only) ──────────────────────────────────────────────
        if filepath.suffix == ".py":
            bd_out = out_path_for(filepath, "bandit")
            if bd_out.exists():
                print("           bandit  (cached)")
            else:
                run_bandit(filepath, bd_out)
                print("           bandit  ✓")

        # ── SonarQube ─────────────────────────────────────────────────────────
        sq_out = out_path_for(filepath, "sonarqube")
        if sq_out.exists():
            print("           sonar   (cached)")
        else:
            if SONAR_TOKEN == "YOUR_SONAR_TOKEN_HERE":
                print("           sonar   SKIPPED (set SONAR_TOKEN in script)")
            else:
                run_sonarqube(filepath, sq_out)
                print("           sonar   ✓")

    print(f"\nAll done. Raw results → {RAW_DIR}")


if __name__ == "__main__":
    scan_all()