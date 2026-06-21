"""
combine_multifile_tasks.py
--------------------------
Some tasks were answered by an LLM with *several* source files for one prompt
condition, stored in a sub-folder, e.g.:

    Grok/Python/Task 7/cond_a/app.py
    Grok/Python/Task 7/cond_a/models.py
    Grok/Python/Task 7/cond_a/user_service.py

The scanner (`scan_all.py`) only looks at files directly inside a Task folder,
so these multi-file conditions were silently skipped -> missing snippets and a
wrong Vulnerabilities-Per-Snippet (VPS) denominator.

This script collapses every such sub-folder into ONE file per condition at the
Task level, so each (LLM, language, task, condition) is exactly one snippet:

    Grok/Python/Task 7/cond_a.py     <- app.py + models.py + user_service.py

Combining rules (kept SAST-safe):
  * Python  : plain concatenation; each original file gets a `# ===== name =====`
              banner. Python tolerates repeated imports / re-definitions.
  * JavaScript:
      - CommonJS files (require / module.exports) are wrapped in a bare `{ ... }`
        block so repeated top-level `const`/`let`/`class` do NOT collide
        (which would otherwise be a SyntaxError and break SonarQube parsing).
      - Files using ES-module `import`/`export` are concatenated raw (a block
        would make `import`/`export` illegal). These are rare in this corpus.

Existing top-level files of the same condition are folded in too, so nothing is
lost. Sub-folders are removed after a successful write.

Usage (run from inside scripts/ or from "LLM Code Snippets/"):
    python combine_multifile_tasks.py            # DRY RUN — shows what it would do
    python combine_multifile_tasks.py --apply    # actually rewrite + delete folders

After --apply, re-run the pipeline:
    python scan_all.py            (re-scans the new combined files; needs SonarQube up)
    python parse_results.py
    python analyze.py
"""

import pathlib
import re
import shutil
import sys

# scripts/ lives inside "LLM Code Snippets/", so parent.parent = the corpus root
ROOT = pathlib.Path(__file__).resolve().parent.parent

SKIP_DIRS = {"results", "scripts", ".git", ".github", ".scannerwork", ".venv"}
EXTS = {".py", ".js"}

APPLY = "--apply" in sys.argv


def canon_condition(folder_name: str) -> str:
    """Map any condition folder name to a canonical 'cond_a' / 'cond_b'."""
    s = folder_name.lower().replace("-", "_").replace(".", "_").replace(" ", "_")
    if (s.endswith("_b") or "cond_b" in s or "condition_b" in s
            or "secure" in s or s == "b"):
        return "cond_b"
    return "cond_a"


def wrap_chunk(text: str, label: str, ext: str) -> str:
    """Add a banner and, for CommonJS JS, a block scope to avoid redeclarations."""
    if ext == ".py":
        return f"# ===== {label} =====\n{text.rstrip()}\n"

    banner = f"// ===== {label} ====="
    is_esm = re.search(r"(?m)^\s*(import|export)\b", text) is not None
    if is_esm:
        # Block-wrapping would make import/export illegal — leave raw.
        return f"{banner}\n{text.rstrip()}\n"
    # CommonJS: isolate top-level declarations in a bare block.
    body = text.rstrip()
    return f"{banner}\n{{\n{body}\n}}\n"


def collect_code(folder: pathlib.Path) -> list:
    return sorted(
        f for f in folder.rglob("*")
        if f.is_file() and f.suffix in EXTS
    )


def process_task(task_dir: pathlib.Path) -> list:
    """Return a list of (target_path, combined_text, [folders_to_remove])."""
    sub_dirs = [d for d in task_dir.iterdir() if d.is_dir()]
    code_subs = [d for d in sub_dirs if collect_code(d)]
    if not code_subs:
        return []

    # Group sub-folders by the condition they represent.
    by_cond: dict = {}
    for sub in code_subs:
        by_cond.setdefault(canon_condition(sub.name), []).append(sub)

    actions = []
    for cond, subs in sorted(by_cond.items()):
        files = [f for sub in subs for f in collect_code(sub)]
        ext = files[0].suffix
        target = task_dir / f"{cond}{ext}"

        chunks = []
        # Fold in an already-existing top-level file of this condition (no data loss).
        if target.exists():
            chunks.append(wrap_chunk(
                target.read_text(encoding="utf-8", errors="ignore"),
                f"(existing) {target.name}", ext))
        for f in files:
            label = f.relative_to(task_dir).as_posix()
            chunks.append(wrap_chunk(
                f.read_text(encoding="utf-8", errors="ignore"), label, ext))

        combined = "\n".join(chunks).rstrip() + "\n"
        actions.append((target, combined, subs))

    return actions


def iter_task_dirs():
    for llm_dir in sorted(ROOT.iterdir()):
        if not llm_dir.is_dir() or llm_dir.name in SKIP_DIRS:
            continue
        for lang_dir in sorted(p for p in llm_dir.iterdir() if p.is_dir()):
            for task_dir in sorted(p for p in lang_dir.iterdir() if p.is_dir()):
                yield task_dir


def main():
    mode = "APPLY" if APPLY else "DRY RUN (use --apply to execute)"
    print(f"Corpus root : {ROOT}")
    print(f"Mode        : {mode}\n")

    total_targets = 0
    total_folders = 0
    for task_dir in iter_task_dirs():
        for target, combined, subs in process_task(task_dir):
            total_targets += 1
            total_folders += len(subs)
            rel = target.relative_to(ROOT).as_posix()
            src = ", ".join(s.name for s in subs)
            lines = combined.count("\n")
            print(f"  {rel}  <-  [{src}]  ({lines} lines)")
            if APPLY:
                target.write_text(combined, encoding="utf-8")
                for sub in subs:
                    shutil.rmtree(sub)

    print(f"\n{'Wrote' if APPLY else 'Would write'} {total_targets} combined files; "
          f"{'removed' if APPLY else 'would remove'} {total_folders} sub-folders.")
    if not APPLY:
        print("\nNothing changed. Re-run with --apply to perform the combine.")


if __name__ == "__main__":
    main()
