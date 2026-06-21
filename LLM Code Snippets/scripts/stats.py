"""
stats.py
--------
Statistical test of the prompting effect (Condition A standard vs B secure).

For every snippet (LLM x language x task x condition) we count the number of
UNIQUE security CWE instances. A and B are paired by (language, task) -- the
same task under two prompts -- so the correct test is the paired, non-parametric
Wilcoxon signed-rank test (per LLM, and pooled across all LLMs).

We report, per LLM:
    n pairs, n non-zero pairs, median A, median B,
    Wilcoxon W, one-sided p-value (H1: A > B),
    matched-pairs rank-biserial effect size and its magnitude.

Run after parse_results.py:
    python stats.py
Writes: results/csv/stats_prompting.csv
        results/csv/per_snippet_counts.csv   (the raw paired data)

IMPORTANT: snippets with zero findings are included (count 0). They are
recovered from the per-file Semgrep JSONs so the test is not biased toward
only-vulnerable snippets.
"""

import csv
import sys
import pathlib
from collections import defaultdict

import numpy as np
from scipy.stats import wilcoxon, rankdata

ROOT     = pathlib.Path(__file__).resolve().parent.parent
CSV_DIR  = ROOT / "results" / "csv"
RAW_DIR  = ROOT / "results" / "raw"
FINDINGS = CSV_DIR / "all_findings.csv"

SCRIPTS_DIR = pathlib.Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
from parse_results import detect_condition_from_stem  # noqa: E402

LLMS = ["ChatGPT", "Claude", "Gemini", "Grok", "DeepSeek", "CoPilot"]


# ─────────────────────────────────────────────────────────────────────────────
# BUILD THE PAIRED PER-SNIPPET COUNTS
# ─────────────────────────────────────────────────────────────────────────────

def snippet_universe():
    """Every snippet that was scanned -> key (llm, lang, task, condition).

    Derived from the per-file Semgrep JSONs (one exists per snippet), so
    zero-finding snippets are included.
    """
    universe = set()
    for f in RAW_DIR.rglob("*_semgrep.json"):
        rel = f.relative_to(RAW_DIR)
        if len(rel.parts) < 4:
            continue
        llm, lang, task = rel.parts[0], rel.parts[1], rel.parts[2]
        stem = f.stem[:-len("_semgrep")]
        cond = detect_condition_from_stem(stem)
        universe.add((llm, lang, task, cond))
    return universe


def security_counts():
    """(llm, lang, task, condition) -> number of unique security CWE instances."""
    cwes = defaultdict(set)
    with open(FINDINGS, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["is_security"] != "True":
                continue
            key = (r["llm"], r["language"], r["task_name"], r["condition"])
            cwes[key].add(r["cwe_id"])
    return {k: len(v) for k, v in cwes.items()}


def paired_data():
    """Per LLM -> (a_array, b_array) aligned by (language, task)."""
    universe = snippet_universe()
    counts   = security_counts()

    per_llm = {}
    rows_out = []
    for llm in LLMS:
        keys = sorted({(lang, task) for (l, lang, task, c) in universe if l == llm})
        a_vals, b_vals = [], []
        for lang, task in keys:
            a = counts.get((llm, lang, task, "A_standard"), 0)
            b = counts.get((llm, lang, task, "B_secure"), 0)
            a_vals.append(a)
            b_vals.append(b)
            rows_out.append([llm, lang, task, a, b, a - b])
        per_llm[llm] = (np.array(a_vals), np.array(b_vals))

    with open(CSV_DIR / "per_snippet_counts.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["LLM", "language", "task", "A_standard", "B_secure", "diff"])
        w.writerows(rows_out)

    return per_llm


# ─────────────────────────────────────────────────────────────────────────────
# STATISTICS
# ─────────────────────────────────────────────────────────────────────────────

def rank_biserial(a, b):
    """Matched-pairs rank-biserial effect size for Wilcoxon signed-rank.

    r = (R+ - R-) / (R+ + R-), range [-1, 1]; positive => A > B.
    """
    diff = a - b
    nz = diff[diff != 0]
    if nz.size == 0:
        return 0.0
    ranks = rankdata(np.abs(nz))
    r_plus  = ranks[nz > 0].sum()
    r_minus = ranks[nz < 0].sum()
    total = r_plus + r_minus
    return float((r_plus - r_minus) / total) if total else 0.0


def magnitude(r):
    a = abs(r)
    if a < 0.1:  return "negligible"
    if a < 0.3:  return "small"
    if a < 0.5:  return "medium"
    return "large"


def run(per_llm):
    print("=" * 90)
    print("WILCOXON SIGNED-RANK TEST — prompting effect (H1: standard A has MORE")
    print("vulnerabilities than secure B). Paired by (language, task) per LLM.")
    print("=" * 90)
    header = (f"{'LLM':<12}{'n':>4}{'nz':>4}{'medA':>6}{'medB':>6}"
              f"{'W':>9}{'p(1-sided)':>12}{'rank-bis':>10}  {'effect':<11}{'sig?':>5}")
    print(header)
    print("-" * 90)

    out = [["LLM", "n_pairs", "n_nonzero", "median_A", "median_B",
            "W", "p_value", "rank_biserial", "effect_magnitude", "significant"]]

    # pooled across all LLMs
    all_a = np.concatenate([per_llm[l][0] for l in LLMS])
    all_b = np.concatenate([per_llm[l][1] for l in LLMS])

    def one(label, a, b):
        n  = a.size
        nz = int(np.count_nonzero(a - b))
        rb = rank_biserial(a, b)
        if nz == 0:
            W, p = float("nan"), 1.0
        else:
            try:
                W, p = wilcoxon(a, b, alternative="greater", zero_method="wilcox")
            except ValueError:
                W, p = float("nan"), 1.0
        sig = "yes" if p < 0.05 else "no"
        Wd = "  n/a" if np.isnan(W) else f"{W:>9.1f}"
        print(f"{label:<12}{n:>4}{nz:>4}{np.median(a):>6.1f}{np.median(b):>6.1f}"
              f"{Wd}{p:>12.4f}{rb:>10.3f}  {magnitude(rb):<11}{sig:>5}")
        out.append([label, n, nz, f"{np.median(a):.2f}", f"{np.median(b):.2f}",
                    "" if np.isnan(W) else f"{W:.1f}", f"{p:.5f}",
                    f"{rb:.4f}", magnitude(rb), sig])

    for llm in LLMS:
        a, b = per_llm[llm]
        one(llm, a, b)
    print("-" * 90)
    one("ALL (pooled)", all_a, all_b)

    with open(CSV_DIR / "stats_prompting.csv", "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(out)

    print("\nNotes:")
    print("  * p < 0.05 => the security prompt significantly reduced vulnerabilities.")
    print("  * rank-biserial: effect size (|r|<.1 negligible, <.3 small, <.5 medium, >=.5 large).")
    print("  * Small per-LLM n (20 pairs) means low power; the pooled row is the strongest test.")
    print(f"  -> Saved {CSV_DIR/'stats_prompting.csv'} and per_snippet_counts.csv")


if __name__ == "__main__":
    if not FINDINGS.exists():
        raise SystemExit(f"ERROR: {FINDINGS} not found. Run parse_results.py first.")
    run(paired_data())
