import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { EditorView, Decoration, ViewPlugin, type DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { useMemo } from "react";

/** Highlights the given 1-based line numbers with the .cm-vuln-line class. */
function highlightLines(lines: number[]) {
  const set = new Set(lines);
  const build = (view: EditorView) => {
    const builder = new RangeSetBuilder<Decoration>();
    for (let pos = 0; pos <= view.state.doc.length; ) {
      const line = view.state.doc.lineAt(pos);
      if (set.has(line.number)) {
        builder.add(line.from, line.from, Decoration.line({ class: "cm-vuln-line" }));
      }
      pos = line.to + 1;
    }
    return builder.finish();
  };
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = build(view);
      }
      update(u: { docChanged: boolean; view: EditorView }) {
        if (u.docChanged) this.decorations = build(u.view);
      }
    },
    { decorations: (v) => v.decorations },
  );
}

export default function CodeMirrorEditor({
  value,
  onChange,
  language = "python",
  readOnly = false,
  highlight = [],
  height = "320px",
  placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  language?: string;
  readOnly?: boolean;
  highlight?: number[];
  height?: string;
  placeholder?: string;
}) {
  const extensions = useMemo(() => {
    const langExt = language === "javascript" ? javascript({ jsx: true, typescript: true }) : python();
    const exts = [langExt, EditorView.lineWrapping];
    if (highlight.length) exts.push(highlightLines(highlight));
    return exts;
  }, [language, highlight]);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={tokyoNight}
        height={height}
        readOnly={readOnly}
        editable={!readOnly}
        placeholder={placeholder}
        extensions={extensions}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: !readOnly }}
      />
    </div>
  );
}
