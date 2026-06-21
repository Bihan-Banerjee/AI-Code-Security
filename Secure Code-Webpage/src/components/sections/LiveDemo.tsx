import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Play, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Reveal from "@/components/effects/Reveal";

const vulnerableCode = `import sqlite3

def authenticate_user(username, password):
    # SQL injection: user input concatenated into the query
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    conn = sqlite3.connect('users.db')
    result = conn.cursor().execute(query).fetchone()

    # Hardcoded secret
    SECRET_KEY = "sk-abc123secretkey456"

    if result:
        # XSS: unescaped user input in output
        return f"<div>Welcome {username}!</div>"`;

const fixedCode = `import sqlite3, os
from html import escape

def authenticate_user(username, password):
    # Fixed: parameterised query
    query = "SELECT * FROM users WHERE username=? AND password=?"
    conn = sqlite3.connect('users.db')
    result = conn.cursor().execute(query, (username, password)).fetchone()

    # Fixed: secret from environment
    SECRET_KEY = os.getenv('SECRET_KEY')

    if result:
        # Fixed: HTML-escaped output
        return f"<div>Welcome {escape(username)}!</div>"`;

const findings = [
  { type: "SQL Injection", cwe: "CWE-89", severity: "High", line: 5 },
  { type: "Hardcoded Secret", cwe: "CWE-798", severity: "High", line: 10 },
  { type: "Cross-site Scripting", cwe: "CWE-79", severity: "Medium", line: 14 },
];

const TABS = ["vulnerable", "analysis", "fixed"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  vulnerable: "Vulnerable",
  analysis: "Analysis",
  fixed: "Fixed",
};

function CodePane({ code, accent }: { code: string; accent: "danger" | "ok" }) {
  return (
    <div className="relative">
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          toast.success("Copied to clipboard");
        }}
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground hover:text-primary"
        aria-label="Copy code"
      >
        <Copy className="h-4 w-4" />
      </button>
      <pre
        className={`max-h-96 overflow-auto rounded-xl border bg-background/60 p-5 text-xs leading-relaxed ${
          accent === "danger" ? "border-destructive/30" : "border-success/30"
        }`}
      >
        <code className="font-mono text-foreground/90">{code}</code>
      </pre>
    </div>
  );
}

export default function LiveDemo() {
  const [tab, setTab] = useState<Tab>("vulnerable");

  return (
    <section id="demo" className="relative py-24">
      <div className="container mx-auto px-4">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Interactive demo
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            See it <span className="text-gradient">in action</span>
          </h2>
        </Reveal>

        <Reveal direction="up">
          <div className="glass-strong mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border/60 shadow-glow">
            {/* window chrome */}
            <div className="flex items-center gap-2 border-b border-border/50 bg-background/40 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="h-3 w-3 rounded-full bg-warning/70" />
              <span className="h-3 w-3 rounded-full bg-success/70" />
              <span className="ml-3 font-mono text-xs text-muted-foreground">auth.py — FortiScan</span>
              <Link
                to="/scanner"
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Play className="h-3.5 w-3.5" /> Try yours
              </Link>
            </div>

            {/* tabs */}
            <div className="flex gap-1 border-b border-border/50 bg-background/20 p-2">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    tab === t ? "bg-secondary/70 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {TAB_LABEL[t]}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === "vulnerable" && <CodePane code={vulnerableCode} accent="danger" />}
              {tab === "fixed" && <CodePane code={fixedCode} accent="ok" />}
              {tab === "analysis" && (
                <div className="space-y-3">
                  {findings.map((f) => (
                    <div
                      key={f.type}
                      className={`flex items-center justify-between rounded-xl border-l-4 bg-background/50 p-4 ${
                        f.severity === "High" ? "border-l-destructive" : "border-l-warning"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle
                          className={`h-5 w-5 ${f.severity === "High" ? "text-destructive" : "text-warning"}`}
                        />
                        <div>
                          <p className="font-semibold">{f.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {f.cwe} · line {f.line}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          f.severity === "High"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {f.severity}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => setTab("fixed")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-success/40 bg-success/10 py-3 font-semibold text-success transition-colors hover:bg-success/20"
                  >
                    <CheckCircle2 className="h-4 w-4" /> View secured code <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
