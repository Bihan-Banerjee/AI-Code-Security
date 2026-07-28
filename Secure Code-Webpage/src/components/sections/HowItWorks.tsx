import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Upload, ScanSearch, Wand2 } from "lucide-react";
import Reveal from "@/components/effects/Reveal";
import Eyebrow from "@/components/Eyebrow";

const steps = [
  {
    icon: Upload,
    title: "1 · Submit code",
    description: "Paste or drop your Python or JavaScript files. Everything runs on demand, and nothing is stored without your account.",
  },
  {
    icon: ScanSearch,
    title: "2 · Analyze",
    description: "Bandit and Semgrep scan for vulnerabilities; results are normalized, CWE-tagged, and scored A–F.",
  },
  {
    icon: Wand2,
    title: "3 · Enhance",
    description: "The enhancer rewrites insecure patterns into safe equivalents and shows a clear diff with explanations.",
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 60%"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4" ref={ref}>
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-5 flex justify-center"><Eyebrow>Workflow</Eyebrow></div>
          <h2 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            How it <span className="text-gradient">works</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Three steps from risky code to a secure fix.</p>
        </Reveal>

        <div className="relative">
          {/* Connector path that draws on scroll (desktop) */}
          <svg
            className="pointer-events-none absolute inset-x-0 top-12 hidden h-24 w-full md:block"
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden
          >
            <motion.path
              d="M 166 50 Q 333 -10 500 50 T 834 50"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="2 8"
              strokeLinecap="round"
              style={{ pathLength }}
            />
          </svg>

          <div className="relative grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.12} direction="up">
                <div className="glass relative h-full rounded-2xl p-7 text-center">
                  <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
                    <s.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-medium">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
