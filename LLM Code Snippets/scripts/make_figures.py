"""
make_figures.py
---------------
Generates publication-quality figures (300 dpi PNG) from the parsed result
tables. Run after parse_results.py, analyze.py and stats.py.

    python make_figures.py

Writes to results/figures/:
    fig1_vps_by_model_language.png   VPS per model, Python vs JS
    fig2_prompting_effect.png        Standard vs Secure VPS + reduction %
    fig3_cwe_heatmap.png             CWE x model heatmap
    fig4_tool_coverage.png           Tool coverage + unique findings
    fig5_effect_sizes.png            Wilcoxon effect size per model
"""

import csv
import pathlib

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT    = pathlib.Path(__file__).resolve().parent.parent
CSV_DIR = ROOT / "results" / "csv"
FIG_DIR = ROOT / "results" / "figures"
FIG_DIR.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({
    "figure.dpi": 300,
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.titleweight": "bold",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.alpha": 0.3,
})

C_STD, C_SEC = "#c0392b", "#2980b9"   # standard (red), secure (blue)
C_PY,  C_JS  = "#8e44ad", "#16a085"   # python, javascript


def read_csv(name):
    with open(CSV_DIR / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def save(fig, name):
    path = FIG_DIR / name
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    print(f"  -> {path}")


# ── Fig 1: VPS by model and language ─────────────────────────────────────────
def fig_vps_by_lang():
    rows = read_csv("vps_by_llm_lang.csv")
    llms = [r["LLM"] for r in rows]
    py   = [float(r["Python"]) for r in rows]
    js   = [float(r["JS"]) for r in rows]
    x = np.arange(len(llms)); w = 0.38

    fig, ax = plt.subplots(figsize=(8, 4.5))
    b1 = ax.bar(x - w/2, py, w, label="Python", color=C_PY)
    b2 = ax.bar(x + w/2, js, w, label="JavaScript", color=C_JS)
    ax.bar_label(b1, fmt="%.1f", padding=2, fontsize=8)
    ax.bar_label(b2, fmt="%.1f", padding=2, fontsize=8)
    ax.set_xticks(x); ax.set_xticklabels(llms)
    ax.set_ylabel("Vulnerabilities per snippet (VPS)")
    ax.set_title("Vulnerability density by model and language (standard prompts)")
    ax.legend()
    save(fig, "fig1_vps_by_model_language.png")


# ── Fig 2: prompting effect (Std vs Secure) ──────────────────────────────────
def fig_prompting_effect():
    rows = read_csv("prompting_effect.csv")
    sig = {r["LLM"]: r.get("significant", "") for r in read_csv("stats_prompting.csv")} \
        if (CSV_DIR / "stats_prompting.csv").exists() else {}
    llms = [r["LLM"] for r in rows]
    std  = [float(r["Standard_VPS"]) for r in rows]
    sec  = [float(r["Secure_VPS"]) for r in rows]
    red  = [float(r["Reduction_pct"]) for r in rows]
    x = np.arange(len(llms)); w = 0.38

    fig, ax = plt.subplots(figsize=(9.5, 4.8))
    b1 = ax.bar(x - w/2, std, w, label="Standard prompt", color=C_STD)
    b2 = ax.bar(x + w/2, sec, w, label="Security-hardened prompt", color=C_SEC)
    ax.bar_label(b1, fmt="%.1f", padding=2, fontsize=8)
    ax.bar_label(b2, fmt="%.1f", padding=2, fontsize=8)
    ymax = max(std + sec)
    for i, r in enumerate(red):
        star = " *" if sig.get(llms[i]) == "yes" else ""
        ax.text(x[i], ymax * 1.06, f"-{r:.0f}%{star}", ha="center",
                fontsize=9, fontweight="bold",
                color="#1e8449" if r > 0 else "#7f8c8d")
    ax.set_ylim(0, ymax * 1.15)
    ax.set_xticks(x); ax.set_xticklabels(llms)
    ax.set_ylabel("Vulnerabilities per snippet (VPS)")
    ax.set_title("Effect of security-hardened prompting on vulnerability density")
    # Legend outside (top) so it never collides with the reduction labels.
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, 1.08), ncol=2, frameon=False)
    ax.text(0.0, -0.16, "labels = % reduction;  *  statistically significant "
            "(Wilcoxon signed-rank, p < 0.05)",
            transform=ax.transAxes, fontsize=8, color="#555")
    save(fig, "fig2_prompting_effect.png")


# ── Fig 3: CWE heatmap ───────────────────────────────────────────────────────
def fig_cwe_heatmap(top=14):
    rows = read_csv("cwe_heatmap.csv")
    skip = {"CWE_ID", "Description", "Total"}
    llms = [c for c in rows[0].keys() if c not in skip]
    rows = sorted(rows, key=lambda r: -int(r["Total"]))[:top]

    labels = [f'{r["CWE_ID"]}  {r["Description"][:34]}' for r in rows]
    mat = np.array([[int(r[l]) for l in llms] for r in rows], dtype=float)

    fig, ax = plt.subplots(figsize=(8.5, 0.5 * len(rows) + 2))
    im = ax.imshow(mat, cmap="YlOrRd", aspect="auto")
    ax.set_xticks(range(len(llms))); ax.set_xticklabels(llms, rotation=30, ha="right")
    ax.set_yticks(range(len(rows))); ax.set_yticklabels(labels, fontsize=8)
    for i in range(mat.shape[0]):
        for j in range(mat.shape[1]):
            v = int(mat[i, j])
            if v:
                ax.text(j, i, v, ha="center", va="center", fontsize=8,
                        color="white" if v > mat.max() * 0.6 else "black")
    ax.set_title("CWE distribution across models (standard prompts)")
    fig.colorbar(im, ax=ax, shrink=0.7, label="unique instances")
    ax.grid(False)
    save(fig, "fig3_cwe_heatmap.png")


# ── Fig 4: tool coverage ─────────────────────────────────────────────────────
def fig_tool_coverage():
    rows = [r for r in read_csv("tool_coverage.csv")
            if r["Tool"] not in ("Union_all_tools", "FortiScan")]
    tools = [r["Tool"] for r in rows]
    cov   = [float(r["Coverage_pct"]) for r in rows]
    sec   = [int(r["Security"]) for r in rows]
    x = np.arange(len(tools))

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4.2))
    b1 = ax1.bar(x, cov, color=["#2980b9", "#27ae60", "#e67e22"])
    ax1.bar_label(b1, fmt="%.0f%%", padding=2)
    ax1.set_xticks(x); ax1.set_xticklabels(tools)
    ax1.set_ylabel("Coverage of union (%)")
    ax1.set_title("Share of all security findings each tool detects")
    ax1.set_ylim(0, 100)

    b2 = ax2.bar(x, sec, color=["#2980b9", "#27ae60", "#e67e22"])
    ax2.bar_label(b2, padding=2)
    ax2.set_xticks(x); ax2.set_xticklabels(tools)
    ax2.set_ylabel("Security findings")
    ax2.set_title("Security findings per tool")
    save(fig, "fig4_tool_coverage.png")


# ── Fig 5: effect sizes ──────────────────────────────────────────────────────
def fig_effect_sizes():
    if not (CSV_DIR / "stats_prompting.csv").exists():
        return
    rows = [r for r in read_csv("stats_prompting.csv") if r["LLM"] != "ALL (pooled)"]
    llms = [r["LLM"] for r in rows]
    rb   = [float(r["rank_biserial"]) for r in rows]
    sig  = [r["significant"] == "yes" for r in rows]
    order = np.argsort(rb)
    llms = [llms[i] for i in order]; rb = [rb[i] for i in order]; sig = [sig[i] for i in order]

    fig, ax = plt.subplots(figsize=(8, 4.2))
    colors = ["#1e8449" if s else "#95a5a6" for s in sig]
    b = ax.barh(llms, rb, color=colors)
    ax.bar_label(b, fmt="%.2f", padding=3, fontsize=9)
    for thr in (0.1, 0.3, 0.5):
        ax.axvline(thr, ls="--", lw=0.8, color="#bbb")
    ax.set_xlim(0, 1.05)
    ax.set_xlabel("Rank-biserial effect size (A vs B)")
    ax.set_title("Prompting effect size per model\n(green = significant; dashed = small/medium/large)")
    save(fig, "fig5_effect_sizes.png")


if __name__ == "__main__":
    print("Generating figures ->", FIG_DIR)
    fig_vps_by_lang()
    fig_prompting_effect()
    fig_cwe_heatmap()
    fig_tool_coverage()
    fig_effect_sizes()
    print("Done.")
