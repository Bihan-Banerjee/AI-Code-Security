import pandas as pd
import json
from pathlib import Path
from collections import defaultdict, Counter
import random

# ──────────────────────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────────────────────
REPO_ROOT     = "."
CSV_PATH      = f"{REPO_ROOT}/LLM Code Snippets/results/csv/all_findings.csv"
SNIPPETS_ROOT = f"{REPO_ROOT}/LLM Code Snippets"
OUTPUT_JSONL  = "fine_tune_dataset.jsonl"

# ──────────────────────────────────────────────────────────────────────────────
# Load CSV safely
# ──────────────────────────────────────────────────────────────────────────────
try:
    df = pd.read_csv(CSV_PATH)

except Exception as e:
    print("\n❌ Failed to load CSV")
    print(e)
    exit()

# Normalize column names
df.columns = [
    c.strip().lower().replace(" ", "_")
    for c in df.columns
]

print("\nColumns found:")
print(df.columns.tolist())

print(f"\nTotal CSV rows: {len(df)}")

# ──────────────────────────────────────────────────────────────────────────────
# Validate required columns
# ──────────────────────────────────────────────────────────────────────────────
required_cols = [
    "llm",
    "language",
    "task_name",
    "cwe_id"
]

missing_cols = [
    c for c in required_cols
    if c not in df.columns
]

if missing_cols:
    print(f"\n❌ Missing required columns: {missing_cols}")
    exit()

# ──────────────────────────────────────────────────────────────────────────────
# Filter only real CWE rows
# ──────────────────────────────────────────────────────────────────────────────
df["cwe_id"] = (
    df["cwe_id"]
    .astype(str)
    .str.strip()
)

security_df = df[
    df["cwe_id"].str.startswith(
        "CWE-",
        na=False
    )
].copy()

# Remove "CWE-" prefix
security_df["cwe_id"] = (
    security_df["cwe_id"]
    .str.replace("CWE-", "", regex=False)
)

print(f"\nSecurity rows only: {len(security_df)}")

if len(security_df) == 0:
    print("\n❌ No valid CWE rows found.")
    exit()

print(
    "\nSample CWE values:",
    security_df["cwe_id"]
    .unique()[:10]
    .tolist()
)

# ──────────────────────────────────────────────────────────────────────────────
# Validate snippets directory
# ──────────────────────────────────────────────────────────────────────────────
snippets_path = Path(SNIPPETS_ROOT)

if not snippets_path.exists():
    print(f"\n❌ Folder not found: {SNIPPETS_ROOT}")
    exit()

# ──────────────────────────────────────────────────────────────────────────────
# Build actual folder mapping
# ──────────────────────────────────────────────────────────────────────────────
actual_llm_folders = {}

for d in snippets_path.iterdir():

    if (
        d.is_dir()
        and d.name not in ("results", "scripts")
    ):
        actual_llm_folders[d.name.lower()] = d.name

print("\nLLM folders on disk:")
print(list(actual_llm_folders.values()))

# ──────────────────────────────────────────────────────────────────────────────
# Normalize LLM names
# ──────────────────────────────────────────────────────────────────────────────
def normalize_llm(name):

    if not name:
        return ""

    return actual_llm_folders.get(
        name.lower().strip(),
        name.strip()
    )

# ──────────────────────────────────────────────────────────────────────────────
# Normalize language names
# ──────────────────────────────────────────────────────────────────────────────
def normalize_lang(name):

    if not name:
        return ""

    lang_map = {
        "js": "JS",
        "javascript": "JS",
        "nodejs": "JS",
        "python": "Python",
        "py": "Python",
    }

    return lang_map.get(
        name.strip().lower(),
        name.strip()
    )

# ──────────────────────────────────────────────────────────────────────────────
# Build findings map
# ──────────────────────────────────────────────────────────────────────────────
findings_map = defaultdict(list)

for _, row in security_df.iterrows():

    llm = normalize_llm(
        str(row["llm"])
    )

    lang = normalize_lang(
        str(row["language"])
    )

    task = str(
        row["task_name"]
    ).strip()

    key = (llm, lang, task)

    findings_map[key].append({

        "cwe_id": str(
            row["cwe_id"]
        ).strip(),

        "description": str(
            row.get(
                "cwe_description",
                row.get("description", "")
            )
        ).strip(),

        "severity": str(
            row.get(
                "severity",
                "MEDIUM"
            )
        ).strip(),
    })

print(
    f"\nUnique (llm, lang, task) "
    f"combinations: {len(findings_map)}"
)

# ──────────────────────────────────────────────────────────────────────────────
# Show sample normalized keys
# ──────────────────────────────────────────────────────────────────────────────
print("\nSample normalized keys:")

for k in list(findings_map.keys())[:6]:
    print(f"  {k}")

# ──────────────────────────────────────────────────────────────────────────────
# File finder
# Handles ALL naming patterns across all LLMs
# ──────────────────────────────────────────────────────────────────────────────
def find_file(llm, lang, task_name, letter):

    ext = "py" if lang == "Python" else "js"

    lo = letter.lower()
    up = letter.upper()

    task_variants = [
        task_name,
        task_name.replace(" ", "_"),
        task_name.replace("_", " "),
    ]

    single_file_names = [

        # Claude style
        f"cond_{lo}.{ext}",
        f"cond-{lo}.{ext}",

        # Standard variants
        f"condition_{up}.{ext}",
        f"condition_{lo}.{ext}",
        f"Condition_{up}.{ext}",
        f"Condition_{lo}.{ext}",

        # Dot variants
        f"condition.{up}.{ext}",
        f"Condition.{up}.{ext}",

        # Typo variants
        f"condtion_{lo}.{ext}",
        f"Condtion_{up}.{ext}",
    ]

    subdir_names = [

        # Claude style
        f"cond_{lo}",
        f"cond_{up}",

        # Standard
        f"Condition_{up}",
        f"condition_{lo}",
    ]

    tried_paths = []

    for task_v in task_variants:

        base = (
            Path(SNIPPETS_ROOT)
            / llm
            / lang
            / task_v
        )

        # ── Single-file variants ─────────────────────────────────────────
        for fname in single_file_names:

            p = base / fname

            tried_paths.append(str(p))

            if p.exists():

                try:
                    return (
                        p.read_text(errors="replace"),
                        str(p)
                    )

                except Exception as e:

                    print(f"\n❌ Error reading file: {p}")
                    print(e)

        # ── Multi-file folder variants ──────────────────────────────────
        for dname in subdir_names:

            subdir = base / dname

            if subdir.is_dir():

                parts = []

                try:

                    for f in sorted(subdir.iterdir()):

                        if (
                            f.is_file()
                            and f.suffix in (".py", ".js")
                        ):

                            parts.append(
                                f"// --- {f.name} ---\n"
                                + f.read_text(errors="replace")
                            )

                except Exception as e:

                    print(f"\n❌ Error reading directory: {subdir}")
                    print(e)

                if parts:

                    return (
                        "\n\n".join(parts),
                        str(subdir)
                    )

    return None, tried_paths

# ──────────────────────────────────────────────────────────────────────────────
# Build training records
# ──────────────────────────────────────────────────────────────────────────────
HIGH_PRIORITY = {
    "352", "798", "89", "78", "22",
    "502", "94", "601", "79", "287"
}

records = []
matched = 0
skipped = []

for (llm, lang, task), vulns in findings_map.items():

    a_code, a_path = find_file(
        llm,
        lang,
        task,
        "A"
    )

    b_code, b_path = find_file(
        llm,
        lang,
        task,
        "B"
    )

    # Missing files
    if not a_code or not b_code:

        skipped.append({
            "key": f"{llm}/{lang}/{task}",
            "a_path": a_path if not a_code else "FOUND",
            "b_path": b_path if not b_code else "FOUND",
        })

        continue

    # Empty files
    if not a_code.strip() or not b_code.strip():
        continue

    # Deduplicate CWE descriptions
    cwe_lines = list({

        f"CWE-{v['cwe_id']}: "
        f"{v['description']} "
        f"[Severity: {v['severity']}]"

        for v in vulns
    })

    vuln_summary = "\n".join(cwe_lines)

    lang_tag = (
        "Python (Flask)"
        if lang == "Python"
        else "JavaScript (Express.js)"
    )

    instruction = (
        f"You are a security code reviewer. "
        f"The following {lang_tag} code "
        f"contains these vulnerabilities:\n"
        f"{vuln_summary}\n"
        f"Rewrite the code to fix ALL listed "
        f"vulnerabilities. "
        f"Return ONLY the fixed code "
        f"with no explanation."
    )

    cwe_ids = [
        v["cwe_id"]
        for v in vulns
    ]

    multiplier = (
        3
        if set(cwe_ids) & HIGH_PRIORITY
        else 1
    )

    record = {
        "instruction": instruction,
        "input": a_code.strip(),
        "output": b_code.strip(),
        "metadata": {
            "llm": llm,
            "lang": lang,
            "task": task,
            "cwes": cwe_ids,
        },
    }

    records.extend([record] * multiplier)

    matched += 1

# ──────────────────────────────────────────────────────────────────────────────
# Shuffle records
# ──────────────────────────────────────────────────────────────────────────────
random.seed(42)
random.shuffle(records)

# ──────────────────────────────────────────────────────────────────────────────
# Report
# ──────────────────────────────────────────────────────────────────────────────
print(f"\n{'=' * 60}")
print(f"Matched (both A+B found) : {matched} / {len(findings_map)}")
print(f"Skipped entries          : {len(skipped)}")
print(f"Total records created    : {len(records)}")

# ──────────────────────────────────────────────────────────────────────────────
# Show skipped examples
# ──────────────────────────────────────────────────────────────────────────────
if skipped:

    print("\nFirst 15 skipped entries:")

    for s in skipped[:15]:

        print(f"\nKey: {s['key']}")

        if isinstance(s["a_path"], list):
            print(
                f"A tried: "
                f"{s['a_path'][0]} "
                f"... ({len(s['a_path'])} variants)"
            )

        if isinstance(s["b_path"], list):
            print(
                f"B tried: "
                f"{s['b_path'][0]} "
                f"... ({len(s['b_path'])} variants)"
            )

# ──────────────────────────────────────────────────────────────────────────────
# Save JSONL safely
# ──────────────────────────────────────────────────────────────────────────────
try:

    with open(
        OUTPUT_JSONL,
        "w",
        encoding="utf-8"
    ) as f:

        for r in records:
            f.write(json.dumps(r) + "\n")

    print(f"\n✅ Saved → {OUTPUT_JSONL}")

except Exception as e:

    print("\n❌ Failed to save JSONL")
    print(e)

# ──────────────────────────────────────────────────────────────────────────────
# CWE statistics
# ──────────────────────────────────────────────────────────────────────────────
all_cwes = [
    c
    for r in records
    for c in r["metadata"]["cwes"]
]

if all_cwes:

    print("\nTop 15 CWEs in training set:")

    for cwe, cnt in Counter(all_cwes).most_common(15):

        print(
            f"  CWE-{cwe:<8} "
            f"{cnt:>4} examples"
        )

else:
    print("\n⚠️ No CWE statistics available.")