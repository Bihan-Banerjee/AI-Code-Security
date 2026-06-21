import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Scan, Eye, Lock, Code2, Bug, FileSearch,
  CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import ParticleField from "@/components/effects/ParticleField";
import Parallax from "@/components/effects/Parallax";
import Magnetic from "@/components/effects/Magnetic";
import Reveal from "@/components/effects/Reveal";

type Sample = {
  grade: string;
  score: number;
  tone: "ok" | "warn" | "bad";
  checks: { icon: typeof Lock; text: string }[];
};

// Illustrative sample reports (clearly labelled in the UI) — not live data.
const SAMPLES: Sample[] = [
  {
    grade: "A", score: 96, tone: "ok",
    checks: [
      { icon: CheckCircle2, text: "No critical vulnerabilities" },
      { icon: Lock, text: "Parameterised queries used" },
      { icon: Shield, text: "Secrets loaded from env" },
    ],
  },
  {
    grade: "C", score: 68, tone: "warn",
    checks: [
      { icon: AlertTriangle, text: "Weak hash (MD5) detected" },
      { icon: Code2, text: "Missing input validation" },
      { icon: Lock, text: "TLS verification disabled" },
    ],
  },
  {
    grade: "F", score: 34, tone: "bad",
    checks: [
      { icon: XCircle, text: "SQL injection (CWE-89)" },
      { icon: Bug, text: "eval() on user input" },
      { icon: Lock, text: "Hardcoded API key" },
    ],
  },
];

const toneClass = {
  ok: { text: "text-success", ring: "border-success/50", grad: "from-success to-primary" },
  warn: { text: "text-warning", ring: "border-warning/50", grad: "from-warning to-accent" },
  bad: { text: "text-destructive", ring: "border-destructive/50", grad: "from-destructive to-accent" },
};

const floatIcons = [
  { Icon: Lock, pos: "-left-8 -top-8", depth: 26 },
  { Icon: Code2, pos: "-right-8 -top-6", depth: 18 },
  { Icon: FileSearch, pos: "-bottom-8 -left-6", depth: 20 },
  { Icon: Bug, pos: "-bottom-6 -right-8", depth: 30 },
];

export default function Hero() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SAMPLES.length), 3600);
    return () => clearInterval(t);
  }, []);
  const s = SAMPLES[idx];
  const tone = toneClass[s.tone];

  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <ParticleField />
      <div className="pointer-events-none absolute inset-0 bg-gradient-aurora" />

      <div className="container relative mx-auto grid items-center gap-12 px-4 pb-20 pt-16 lg:min-h-[88vh] lg:grid-cols-2 lg:pt-24">
        {/* Left */}
        <div className="space-y-7">
          <Reveal direction="right">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              <Shield className="h-4 w-4" />
              AI-assisted code security
            </span>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              Ship code that's
              <br />
              <span className="text-gradient">secure by default</span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Scan Python &amp; JavaScript for real vulnerabilities with Bandit and Semgrep, see every finding
              mapped to its CWE, and apply deterministic secure-code fixes — no guesswork, no broken output.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="flex flex-wrap gap-4">
              <Magnetic strength={0.35}>
                <Link
                  to="/scanner"
                  className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-glow transition-shadow hover:shadow-glow-accent"
                >
                  <span className="absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-700 group-hover:translate-x-full" />
                  <Scan className="h-5 w-5" />
                  Start Security Scan
                </Link>
              </Magnetic>
              <Magnetic strength={0.25}>
                <Link
                  to="/demo"
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-7 py-3.5 font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  <Eye className="h-5 w-5" />
                  View Demo
                </Link>
              </Magnetic>
            </div>
          </Reveal>

          {/* Honest capability chips (no fabricated metrics) */}
          <Reveal delay={0.2}>
            <div className="flex flex-wrap gap-2 pt-2">
              {["Python & JavaScript", "CWE-mapped findings", "Bandit + Semgrep", "Free & open source"].map(
                (c) => (
                  <span
                    key={c}
                    className="rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {c}
                  </span>
                ),
              )}
            </div>
          </Reveal>
        </div>

        {/* Right — sample report card */}
        <Reveal direction="left" delay={0.1} className="relative flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-80 w-80 rounded-full border border-primary/15 animate-spin-slow" />
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-64 w-64 rounded-full border border-accent/15 animate-glow-pulse" />
            </div>

            <div className={`glass-strong relative w-[19rem] rounded-2xl border-2 ${tone.ring} p-7 shadow-glow`}>
              <span className="absolute right-4 top-4 rounded-md bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sample report
              </span>
              <div className="mb-5 flex justify-center">
                <div className={`rounded-2xl bg-gradient-to-br ${tone.grad} p-5 shadow-glow`}>
                  <Shield className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">Security score</p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={s.grade}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className={`font-display text-5xl font-bold ${tone.text}`}
                  >
                    {s.grade}
                  </motion.div>
                </AnimatePresence>
                <p className="mt-1 text-xs text-muted-foreground">{s.score}/100</p>
              </div>

              <div className="mt-5 space-y-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={s.grade + "-list"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    {s.checks.map((c, i) => (
                      <motion.div
                        key={c.text}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2"
                      >
                        <c.icon className={`h-4 w-4 flex-shrink-0 ${tone.text}`} />
                        <span className="text-xs font-medium text-foreground/90">{c.text}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {floatIcons.map(({ Icon, pos, depth }, i) => (
              <Parallax key={i} depth={depth} className={`absolute ${pos}`}>
                <div className="animate-float rounded-xl border border-border/60 bg-card/70 p-3 shadow-glow-sm backdrop-blur" style={{ animationDelay: `${i * 0.6}s` }}>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </Parallax>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
