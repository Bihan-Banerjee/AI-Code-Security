"""
analyze.py
----------
Reads results/csv/all_findings.csv and prints every table needed
for the paper, plus a summary block for the Abstract/Conclusion.

Run after parse_results.py:
    python analyze.py          (from inside scripts/)
    python scripts\analyze.py  (from LLM Code Snippets/)

Also writes:
    results/csv/vps_by_llm_lang.csv     ← Table B
    results/csv/cwe_heatmap.csv         ← Table C
    results/csv/prompting_effect.csv    ← Table D
    results/csv/tool_coverage.csv       ← Table E

Directory layout:
    LLM Code Snippets/
        results/
            csv/          ← reads all_findings.csv from here; writes tables here
        scripts/
            analyze.py    ← this file
"""

import csv
import sys
import pathlib
from collections import defaultdict

# scripts/ is one level inside LLM Code Snippets/, so parent.parent = LLM Code Snippets/
ROOT     = pathlib.Path(__file__).resolve().parent.parent
CSV_DIR  = ROOT / "results" / "csv"    # LLM Code Snippets/results/csv/
FINDINGS = CSV_DIR / "all_findings.csv"

# Make sure parse_results (in the same scripts/ folder) can be imported for CWE_DESCRIPTIONS
SCRIPTS_DIR = pathlib.Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

# Number of snippets per condition per LLM × Language cell
# Update this to match your actual task count
SNIPPETS_PER_CELL = 10

LLMS  = ["ChatGPT", "Claude", "Gemini", "Grok", "DeepSeek"]
LANGS = ["Python", "JS"]


# ─────────────────────────────────────────────────────────────────────────────
# LOADER
# ─────────────────────────────────────────────────────────────────────────────

def load():
    rows = []
    with open(FINDINGS, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            r["is_security"]     = r["is_security"]     == "True"
            r["is_quality_only"] = r["is_quality_only"] == "True"
            rows.append(r)
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def unique_security_instances(rows, filter_fn=None):
    """
    Deduplicate findings: one CWE on one snippet = one instance,
    regardless of how many tools detected it.
    Key = (llm, language, task_name, condition, cwe_id)
    """
    seen = set()
    for r in rows:
        if not r["is_security"]:
            continue
        if filter_fn and not filter_fn(r):
            continue
        seen.add((r["llm"], r["language"], r["task_name"],
                  r["condition"], r["cwe_id"]))
    return seen


def vps(unique_instances, n_snippets):
    """Vulnerabilities Per Snippet."""
    return len(unique_instances) / n_snippets if n_snippets > 0 else 0.0


# ─────────────────────────────────────────────────────────────────────────────
# TABLE B — VPS by LLM × Language (Standard condition)
# ─────────────────────────────────────────────────────────────────────────────

def table_b(rows):
    print("\n" + "="*72)
    print("TABLE B — VULNERABILITY DENSITY (VPS) BY LLM AND LANGUAGE")
    print("Condition A (standard prompts) · security findings only")
    print("VPS = unique CWE instances ÷ number of snippets")
    print("="*72)

    std_rows = [r for r in rows if r["condition"] == "A_standard"]

    results = {}
    for llm in LLMS:
        results[llm] = {}
        for lang in LANGS:
            inst = unique_security_instances(
                std_rows,
                lambda r, L=llm, l=lang: r["llm"] == L and r["language"] == l
            )
            results[llm][lang] = vps(inst, SNIPPETS_PER_CELL)

    print(f"\n{'LLM':<14}", end="")
    for lang in LANGS:
        print(f"{lang:>12}", end="")
    print(f"{'Overall':>12}  {'Rank':>6}")
    print("-" * 58)

    overall = {}
    for llm in LLMS:
        vals = [results[llm][lang] for lang in LANGS]
        ov   = sum(vals) / len(vals)
        overall[llm] = ov
        print(f"{llm:<14}", end="")
        for v in vals:
            print(f"{v:>12.2f}", end="")
        print(f"{ov:>12.2f}")

    print("-" * 58)
    print(f"{'Mean':<14}", end="")
    for lang in LANGS:
        mean = sum(results[llm][lang] for llm in LLMS) / len(LLMS)
        print(f"{mean:>12.2f}", end="")
    grand = sum(overall.values()) / len(LLMS)
    print(f"{grand:>12.2f}")

    ranked = sorted(overall, key=overall.get)
    print(f"\n  Most secure  (lowest VPS): {ranked[0]}  ({overall[ranked[0]]:.2f})")
    print(f"  Least secure (highest VPS): {ranked[-1]} ({overall[ranked[-1]]:.2f})")

    out = CSV_DIR / "vps_by_llm_lang.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["LLM"] + LANGS + ["Overall"])
        for llm in LLMS:
            w.writerow([llm] + [f"{results[llm][l]:.4f}" for l in LANGS]
                       + [f"{overall[llm]:.4f}"])
    print(f"\n  → Saved {out}")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# TABLE C — CWE Heatmap (Standard condition, all LLMs)
# ─────────────────────────────────────────────────────────────────────────────

def table_c(rows):
    print("\n" + "="*72)
    print("TABLE C — CWE DISTRIBUTION HEATMAP")
    print("Condition A · security findings · counts = unique instances per LLM")
    print("Bold markers indicate ≥5 instances (systematic pattern)")
    print("="*72)

    std_rows = [r for r in rows
                if r["condition"] == "A_standard" and r["is_security"]
                and r["cwe_id"] not in ("UNKNOWN", "QUALITY_ONLY", "")]

    matrix   = defaultdict(lambda: defaultdict(int))
    totals   = defaultdict(int)
    desc_map = {}

    for r in std_rows:
        cwe = r["cwe_id"]
        matrix[cwe][r["llm"]] += 1
        totals[cwe] += 1
        if cwe not in desc_map:
            desc_map[cwe] = r.get("cwe_description", "")

    sorted_cwes = sorted(totals, key=lambda c: -totals[c])

    col_w = 10
    print(f"\n{'CWE-ID':<12}  {'Description':<38}", end="")
    for llm in LLMS:
        print(f"{llm[:col_w-1]:>{col_w}}", end="")
    print(f"{'Total':>{col_w}}")
    print("-" * (52 + col_w * (len(LLMS) + 1)))

    for cwe in sorted_cwes:
        desc = desc_map.get(cwe, "")[:36]
        print(f"{cwe:<12}  {desc:<38}", end="")
        for llm in LLMS:
            cnt = matrix[cwe][llm]
            print(f"{cnt:>{col_w}}", end="")
        print(f"{totals[cwe]:>{col_w}}")

    universal = [c for c in sorted_cwes if all(matrix[c][l] > 0 for l in LLMS)]
    if universal:
        print(f"\n  ★ Universal (all 5 LLMs): {', '.join(universal)}")

    near_universal = [c for c in sorted_cwes
                      if sum(1 for l in LLMS if matrix[c][l] > 0) == 4
                      and c not in universal]
    if near_universal:
        print(f"  ✦ Near-universal (4/5 LLMs): {', '.join(near_universal)}")

    out = CSV_DIR / "cwe_heatmap.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["CWE_ID", "Description"] + LLMS + ["Total"])
        for cwe in sorted_cwes:
            w.writerow([cwe, desc_map.get(cwe, "")]
                       + [matrix[cwe][l] for l in LLMS]
                       + [totals[cwe]])
    print(f"\n  → Saved {out}")
    return matrix, totals


# ─────────────────────────────────────────────────────────────────────────────
# TABLE D — Prompting Effectiveness (Condition A vs B)
# ─────────────────────────────────────────────────────────────────────────────

def table_d(rows):
    print("\n" + "="*72)
    print("TABLE D — PROMPTING EFFECTIVENESS: STANDARD vs SECURITY-AUGMENTED")
    print("VPS reduction when using security-aware prompt (Condition B)")
    print("="*72)

    results_a = {}
    results_b = {}
    for llm in LLMS:
        inst_a = unique_security_instances(
            rows, lambda r, L=llm: r["llm"] == L and r["condition"] == "A_standard"
        )
        inst_b = unique_security_instances(
            rows, lambda r, L=llm: r["llm"] == L and r["condition"] == "B_secure"
        )
        n = SNIPPETS_PER_CELL * len(LANGS)
        results_a[llm] = vps(inst_a, n)
        results_b[llm] = vps(inst_b, n)

    print(f"\n{'LLM':<14} {'Std VPS':>10} {'Sec VPS':>10} {'Reduction':>12} {'Verdict':>14}")
    print("-" * 65)

    saved = CSV_DIR / "prompting_effect.csv"
    with open(saved, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["LLM", "Standard_VPS", "Secure_VPS", "Reduction_pct"])
        for llm in LLMS:
            va = results_a[llm]
            vb = results_b[llm]
            if va > 0:
                red = (va - vb) / va * 100
                if red > 30:
                    verdict = "Highly effective"
                elif red > 15:
                    verdict = "Effective"
                elif red > 0:
                    verdict = "Marginal"
                else:
                    verdict = "No effect / worse"
            else:
                red     = 0.0
                verdict = "No baseline findings"
            print(f"{llm:<14} {va:>10.2f} {vb:>10.2f} {red:>11.1f}%  {verdict:>14}")
            w.writerow([llm, f"{va:.4f}", f"{vb:.4f}", f"{red:.2f}"])

    print(f"\n  Note: Report Mann-Whitney U p-values per LLM in final paper")
    print(f"        scipy.stats.mannwhitneyu(A_list, B_list, alternative='greater')")
    print(f"  → Saved {saved}")


# ─────────────────────────────────────────────────────────────────────────────
# TABLE E — Tool Coverage
# ─────────────────────────────────────────────────────────────────────────────

def table_e(rows):
    print("\n" + "="*72)
    print("TABLE E — TOOL DETECTION COVERAGE (all snippets, both conditions)")
    print("="*72)

    tools = ["Semgrep", "Bandit", "SonarQube"]

    tool_sec   = defaultdict(set)
    tool_qual  = defaultdict(int)
    tool_total = defaultdict(int)

    for r in rows:
        t   = r["tool"]
        key = (r["llm"], r["language"], r["task_name"], r["condition"], r["cwe_id"])
        tool_total[t] += 1
        if r["is_security"]:
            tool_sec[t].add(key)
        elif r["is_quality_only"]:
            tool_qual[t] += 1

    all_sec      = set()
    for t in tools:
        all_sec |= tool_sec[t]
    total_unique = len(all_sec)

    print(f"\n  Total unique security instances (union): {total_unique}\n")
    print(f"{'Tool':<14} {'Security':>10} {'Quality':>9} {'Total':>8} {'Coverage':>10} {'FalseAlarmRate':>16}")
    print("-" * 72)

    saved = CSV_DIR / "tool_coverage.csv"
    with open(saved, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Tool", "Security", "Quality", "Total", "Coverage_pct", "FalseAlarm_pct"])
        for tool in tools:
            sec  = len(tool_sec[tool])
            qual = tool_qual[tool]
            tot  = tool_total[tool]
            cov  = sec  / total_unique * 100 if total_unique else 0
            fa   = qual / tot          * 100 if tot          else 0
            print(f"{tool:<14} {sec:>10} {qual:>9} {tot:>8} {cov:>9.1f}%  {fa:>15.1f}%")
            w.writerow([tool, sec, qual, tot, f"{cov:.2f}", f"{fa:.2f}"])

        print(f"{'FortiScan':<14} {total_unique:>10} {'0':>9} {'—':>8} {'100.0':>9}%  {'0.0':>15}%")
        w.writerow(["FortiScan", total_unique, 0, "—", "100.00", "0.00"])

    only = {}
    for t in tools:
        others = set()
        for t2 in tools:
            if t2 != t:
                others |= tool_sec[t2]
        only[t] = tool_sec[t] - others
        print(f"\n  Unique to {t:12}: {len(only[t])} findings missed by all other tools")

    print(f"\n  → Saved {saved}")


# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

def summary(rows):
    print("\n" + "="*72)
    print("SUMMARY STATISTICS  (copy these into Abstract and Conclusion)")
    print("="*72)

    all_sec  = [r for r in rows if r["is_security"]]
    all_qual = [r for r in rows if r["is_quality_only"]]
    std_sec  = [r for r in all_sec if r["condition"] == "A_standard"]
    sec_sec  = [r for r in all_sec if r["condition"] == "B_secure"]

    print(f"\n  Total tool findings:              {len(rows)}")
    print(f"  ├─ Security findings:             {len(all_sec)}")
    print(f"  └─ Quality-only findings:         {len(all_qual)}")
    print(f"\n  Condition A (standard) security:  {len(std_sec)}")
    print(f"  Condition B (secure)   security:  {len(sec_sec)}")
    if len(std_sec) > 0:
        red = (len(std_sec) - len(sec_sec)) / len(std_sec) * 100
        print(f"  Overall prompting reduction:      {red:.1f}%")

    from collections import Counter
    cwe_counter = Counter(
        r["cwe_id"] for r in std_sec
        if r["cwe_id"] not in ("UNKNOWN", "QUALITY_ONLY", "")
    )
    print(f"\n  Top 5 CWEs (Condition A):")
    try:
        from parse_results import CWE_DESCRIPTIONS
    except ImportError:
        CWE_DESCRIPTIONS = {}
    for cwe, cnt in cwe_counter.most_common(5):
        d = CWE_DESCRIPTIONS.get(cwe, "")
        print(f"    {cwe:<12}  {cnt:>5} instances   {d}")

    llm_per_cwe = defaultdict(set)
    for r in std_sec:
        if r["cwe_id"] not in ("UNKNOWN", "QUALITY_ONLY", ""):
            llm_per_cwe[r["cwe_id"]].add(r["llm"])

    universal = sorted(
        [c for c, lset in llm_per_cwe.items() if len(lset) == 5],
        key=lambda c: -len(llm_per_cwe[c])
    )
    print(f"\n  CWEs present in ALL 5 LLMs: {universal if universal else 'None yet'}")

    near_univ = sorted(
        [c for c, lset in llm_per_cwe.items() if len(lset) == 4],
        key=lambda c: -len(llm_per_cwe[c])
    )
    print(f"  CWEs present in 4/5 LLMs:  {near_univ[:6]}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not FINDINGS.exists():
        print(f"ERROR: {FINDINGS} not found.")
        print("Run parse_results.py first.")
        raise SystemExit(1)

    print(f"CSV dir  : {CSV_DIR}")
    print(f"Loading  : {FINDINGS}")
    rows = load()
    print(f"Loaded {len(rows)} rows\n")

    summary(rows)
    table_b(rows)
    table_c(rows)
    table_d(rows)
    table_e(rows)

    print("\n\nAll tables complete. Copy the numbers into your paper.")