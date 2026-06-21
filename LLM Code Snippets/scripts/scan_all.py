"""
scan_all.py
-----------
Runs Semgrep, Bandit (Python only), and SonarQube over the whole
"LLM Code Snippets" corpus and writes one JSON per (snippet, tool) under
results/raw/, mirroring the snippet path.

PERFORMANCE: tools are run in BATCH, not once per file. Launching Semgrep or
SonarQube per-file made each file take ~1 minute (ruleset re-download / fresh
JVM per file) -> ~10 hours for the corpus. Batching runs Semgrep once, Bandit
once, and SonarQube once per (model, language), then splits the results back
into the same per-file JSONs the parser expects -> minutes instead of hours.

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
import shutil
import subprocess
import pathlib
import time
import urllib.request
import urllib.parse
import base64
from collections import defaultdict

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────
# scripts/ is one level inside LLM Code Snippets/, so parent.parent = LLM Code Snippets/
ROOT         = pathlib.Path(__file__).resolve().parent.parent
SNIPPETS_DIR = ROOT                        # ChatGPT/, Claude/, etc. live here
RAW_DIR      = ROOT / "results" / "raw"   # LLM Code Snippets/results/raw/

# Folders inside SNIPPETS_DIR that are NOT LLM snippet folders — skip them
SKIP_DIRS = {"results", "scripts", ".git", ".github", ".scannerwork"}


def _load_dotenv():
    """Minimal .env loader (no third-party dependency).

    Looks for a .env in the project root (parent of 'LLM Code Snippets/') and
    in the current working directory. Existing environment variables win, so an
    explicitly exported SONAR_TOKEN overrides the file.
    """
    candidates = [ROOT.parent / ".env", pathlib.Path.cwd() / ".env"]
    for env_path in candidates:
        if not env_path.is_file():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip().strip('"').strip("'")
            os.environ.setdefault(key, val)


_load_dotenv()

# SonarQube — start with: docker run -d -p 9000:9000 sonarqube:community
# The token is read from the SONAR_TOKEN environment variable (or a .env file in
# the project root) so it is never committed to git. Generate one at:
# Admin -> My Account -> Security -> Generate Token
#   PowerShell:  $env:SONAR_TOKEN = "sqa_xxx"
#   bash:        export SONAR_TOKEN=sqa_xxx
SONAR_URL     = os.environ.get("SONAR_URL", "http://localhost:9000")
SONAR_TOKEN   = os.environ.get("SONAR_TOKEN", "")
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
# BATCHED TOOL RUNNERS
# Each tool runs over the whole corpus (or per model/language for SonarQube);
# results are then split back into per-file JSONs via out_path_for().
# ─────────────────────────────────────────────────────────────────────────────

def _write(out: pathlib.Path, payload: dict):
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _parse_json_stdout(text: str, fallback: dict) -> dict:
    """Parse JSON from a tool's stdout, tolerating leading noise.

    Some tools print a progress banner before the JSON (e.g. Bandit emits
    'Working... 100%' to stdout on large scans), which breaks a naive
    json.loads. We slice from the first '{' to the last '}'.
    """
    if not text or not text.strip():
        return dict(fallback)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return {**fallback, "errors": [text[:500]]}
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return {**fallback, "errors": [text[:500]]}


def llm_dirs():
    return [d for d in sorted(SNIPPETS_DIR.iterdir())
            if d.is_dir() and d.name not in SKIP_DIRS]


def run_semgrep_batch(entries):
    """One Semgrep run over all model folders; split results per file."""
    targets = [str(d) for d in llm_dirs()]
    print(f"[semgrep] one pass over {len(targets)} model folders ...", flush=True)
    result = subprocess.run(
        ["semgrep", "--config", "auto", "--json", "--quiet",
         "--no-git-ignore", *targets],
        capture_output=True, text=True, encoding="utf-8", errors="ignore",
    )
    data = _parse_json_stdout(result.stdout, {"results": []})

    by_path = defaultdict(list)
    for res in data.get("results", []):
        by_path[pathlib.Path(res.get("path", "")).resolve()].append(res)

    for filepath, *_ in entries:
        _write(out_path_for(filepath, "semgrep"),
               {"results": by_path.get(filepath.resolve(), []), "errors": []})
    print(f"[semgrep] {sum(len(v) for v in by_path.values())} findings", flush=True)


def run_bandit_batch(entries):
    """One recursive Bandit run over all model folders (Python only)."""
    targets = [str(d) for d in llm_dirs()]
    print("[bandit] one recursive pass (Python) ...", flush=True)
    result = subprocess.run(
        ["bandit", "-f", "json", "-ll", "--recursive", *targets],
        capture_output=True, text=True,
    )
    data = _parse_json_stdout(result.stdout, {"results": []})

    by_path = defaultdict(list)
    for res in data.get("results", []):
        by_path[pathlib.Path(res.get("filename", "")).resolve()].append(res)

    for filepath, *_ in entries:
        if filepath.suffix != ".py":
            continue
        _write(out_path_for(filepath, "bandit"),
               {"results": by_path.get(filepath.resolve(), []),
                "errors": [], "metrics": {}})
    print(f"[bandit] {sum(len(v) for v in by_path.values())} findings", flush=True)


def _sonar_api(path, params):
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{SONAR_URL}{path}?{qs}")
    creds = base64.b64encode(f"{SONAR_TOKEN}:".encode()).decode()
    req.add_header("Authorization", f"Basic {creds}")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def _wait_for_ce(key, timeout=180):
    """Poll the Compute Engine until this project's analysis is processed."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            act = _sonar_api("/api/ce/activity",
                             {"component": key, "onlyCurrents": "true"})
            tasks = act.get("tasks", [])
            if tasks and all(t.get("status") in ("SUCCESS", "FAILED", "CANCELED")
                             for t in tasks):
                return
        except Exception:
            pass
        time.sleep(3)


def run_sonar_batch(entries):
    """One SonarQube project per (model, language); split issues per file."""
    if not SONAR_TOKEN:
        print("[sonar] SKIPPED (set the SONAR_TOKEN env var / .env)", flush=True)
        for filepath, *_ in entries:
            _write(out_path_for(filepath, "sonarqube"),
                   {"issues": [], "error": "skipped: no token"})
        return
    if not shutil.which("sonar-scanner"):
        print("[sonar] SKIPPED (sonar-scanner not on PATH)", flush=True)
        return

    groups = defaultdict(list)
    for entry in entries:
        groups[(entry[1], entry[2])].append(entry)  # (llm, lang)

    for (llm, lang), items in sorted(groups.items()):
        src_dir = SNIPPETS_DIR / llm / lang
        key = f"fortiscan-{llm}-{lang}".lower().replace(" ", "-").replace("_", "-")
        print(f"[sonar] {llm}/{lang}: {len(items)} files (project {key}) ...",
              flush=True)

        cmd = (
            f"sonar-scanner -Dsonar.projectKey={key} -Dsonar.projectName={key} "
            f"-Dsonar.sources=. -Dsonar.host.url={SONAR_URL} "
            f"-Dsonar.token={SONAR_TOKEN} -Dsonar.scm.disabled=true "
            f"-Dsonar.sourceEncoding=UTF-8 -Dsonar.projectBaseDir=."
        )
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                              cwd=str(src_dir))
        if "EXECUTION SUCCESS" not in (proc.stdout or ""):
            print(f"[sonar]   scanner warning for {key}: "
                  f"{(proc.stdout or proc.stderr)[-200:]}", flush=True)
        _wait_for_ce(key)

        # Fetch every issue (paginated; SonarQube caps p*ps at 10000).
        issues, p = [], 1
        while True:
            try:
                data = _sonar_api("/api/issues/search", {
                    "componentKeys": key, "resolved": "false", "ps": 500, "p": p,
                    "types": "BUG,VULNERABILITY,CODE_SMELL",
                })
            except Exception as e:
                print(f"[sonar]   API error for {key}: {e}", flush=True)
                break
            batch = data.get("issues", [])
            issues.extend(batch)
            if not batch or p * 500 >= min(data.get("total", 0), 10000):
                break
            p += 1

        by_path = defaultdict(list)
        for iss in issues:
            comp = iss.get("component", "")
            relpath = comp.split(":", 1)[1] if ":" in comp else comp
            by_path[(src_dir / relpath).resolve()].append(iss)

        for filepath, *_ in items:
            _write(out_path_for(filepath, "sonarqube"),
                   {"issues": by_path.get(filepath.resolve(), [])})
        print(f"[sonar] {llm}/{lang}: {len(issues)} issues", flush=True)


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

                # Warn about code hidden in sub-folders: this scanner only reads
                # files directly inside a Task folder, so multi-file conditions
                # would be silently skipped. Run combine_multifile_tasks.py first.
                nested = [
                    f for f in task_dir.rglob("*")
                    if f.is_file() and f.suffix in VALID_EXTENSIONS
                    and f.parent != task_dir
                ]
                if nested:
                    print(f"  WARNING: {llm}/{lang}/{task_name} has {len(nested)} "
                          f"code file(s) in sub-folders that will be SKIPPED. "
                          f"Run: python combine_multifile_tasks.py --apply")

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
    print(f"Found {total} snippet files\n", flush=True)

    t0 = time.time()
    run_semgrep_batch(entries)
    run_bandit_batch(entries)
    run_sonar_batch(entries)
    print(f"\nAll done in {time.time() - t0:.0f}s. Raw results → {RAW_DIR}", flush=True)


if __name__ == "__main__":
    scan_all()