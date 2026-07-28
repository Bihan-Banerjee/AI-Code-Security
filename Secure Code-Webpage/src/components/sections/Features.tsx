import { Brain, Wand2, BarChart3, ShieldHalf } from "lucide-react";
import Reveal from "@/components/effects/Reveal";
import Eyebrow from "@/components/Eyebrow";

const features = [
  {
    icon: ShieldHalf,
    title: "Real static analysis",
    description:
      "Findings come from Bandit (Python) and Semgrep (JavaScript), industry-standard scanners rather than hand-wavy heuristics. Every issue is traceable to a file and line.",
  },
  {
    icon: BarChart3,
    title: "CWE-mapped scoring",
    description:
      "Each vulnerability is tagged with its CWE and severity, rolled into a clear A–F security score so you know exactly where to focus.",
  },
  {
    icon: Wand2,
    title: "Deterministic fixes",
    description:
      "The enhancer rewrites known-insecure patterns into safe equivalents and explains every change, so the output stays reliable and never produces broken code.",
  },
  {
    icon: Brain,
    title: "History & analytics",
    description:
      "Every scan and enhancement is saved to your dashboard, with charts to track vulnerabilities by CWE, severity, and over time.",
  },
];

export default function Features() {
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-5 flex justify-center"><Eyebrow>Capabilities</Eyebrow></div>
          <h2 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            Everything you need to <span className="text-gradient">harden your code</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A focused toolkit that detects, explains, and fixes security issues, backed by real tooling.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08} direction="up">
              <div className="card-glow group relative h-full overflow-hidden rounded-2xl bg-card/40 p-6 transition-all duration-300 hover:-translate-y-2 hover:border-primary/60 hover:shadow-glow">
                <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-4 inline-flex rounded-xl border border-primary/20 bg-primary/10 p-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-display text-lg font-medium">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
