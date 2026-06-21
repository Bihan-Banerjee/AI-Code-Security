# Reproducing the SAST results

Run everything from the `scripts/` folder (or give full paths). On Windows use
the project venv: `..\..\.venv\Scripts\python.exe`.

## 0. One-time data normalisation (already applied)

Multi-file task answers (code split across a sub-folder) are merged into a single
file per condition so each `(LLM, language, task, condition)` is exactly one
snippet. Already done, but if new multi-file tasks are added, re-run:

```bash
python combine_multifile_tasks.py          # dry run – shows what it will do
python combine_multifile_tasks.py --apply  # perform the merge
```

After this, every model has 40 snippets (10 tasks x 2 languages x 2 conditions).

## 1. Start SonarQube and set the token

The token is read from an environment variable (never commit it).

```bash
docker run -d -p 9000:9000 sonarqube:community   # wait ~1 min for it to boot
# In SonarQube UI: My Account -> Security -> Generate Token, then:
```
PowerShell:
```powershell
$env:SONAR_TOKEN = "sqa_your_new_token"
```
bash:
```bash
export SONAR_TOKEN=sqa_your_new_token
```

## 2. Clear the broken / missing raw output so it re-scans

Grok's SonarQube scans previously failed with HTTP 401 (expired token), and the
23 newly-combined files have no scan yet. The scanner caches by output-file
existence, so delete the stale Grok SonarQube results to force a re-scan:

PowerShell:
```powershell
Remove-Item "..\results\raw\Grok\*_sonarqube.json" -Recurse -Force
```
bash:
```bash
rm -f ../results/raw/Grok/**/*_sonarqube.json
```

(The combined files have no cached output, so they are picked up automatically.)

## 3. Scan -> parse -> analyze

```bash
python scan_all.py          # Semgrep (all), Bandit (Python), SonarQube (token req.)
python parse_results.py     # -> results/csv/all_findings.csv
python analyze.py           # -> the 5 summary tables + console report
```

## 3b. Statistics and figures (Phase 2)

One-time dependency install:
```bash
pip install scipy matplotlib
```
Then:
```bash
python stats.py             # Wilcoxon signed-rank + effect sizes per model
                            # -> results/csv/stats_prompting.csv, per_snippet_counts.csv
python make_figures.py      # -> results/figures/*.png (300 dpi)
```

Figures produced:
  fig1_vps_by_model_language.png  · fig2_prompting_effect.png
  fig3_cwe_heatmap.png            · fig4_tool_coverage.png
  fig5_effect_sizes.png

## 4. Sanity checks (must pass before using the numbers)

- `scan_all.py` prints **no** "code file(s) in sub-folders ... SKIPPED" warnings.
- No SonarQube raw file contains `"error": "HTTP Error 401"`.
- In `analyze.py` output, **every** model shows non-zero findings in **both**
  `A_standard` and `B_secure` (no model at ~0 VPS, no fake "100% reduction").
- Each model contributes 40 snippets.

## Notes

- `analyze.py` forces UTF-8 stdout, so the box-drawing characters in the tables
  print correctly on Windows consoles.
- Condition (A/B) is derived from the filename by
  `parse_results.detect_condition_from_stem`, which handles all naming variants
  (`cond_a/cond_b`, `Condition_A/Condition_B`, the `Condtion` typo, `cond-b`).
