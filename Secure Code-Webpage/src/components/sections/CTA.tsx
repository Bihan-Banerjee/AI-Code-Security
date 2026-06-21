import { Link } from "react-router-dom";
import { Scan, Sparkles } from "lucide-react";
import Reveal from "@/components/effects/Reveal";
import Magnetic from "@/components/effects/Magnetic";

export default function CTA() {
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4">
        <Reveal direction="scale">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-aurora p-10 text-center sm:p-16">
            <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-50" />
            <div className="relative mx-auto max-w-2xl space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" /> Start in seconds
              </span>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Find and fix vulnerabilities <span className="text-gradient">before they ship</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Run your first scan now — no setup, no credit card. Just paste your code.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <Magnetic strength={0.35}>
                  <Link
                    to="/scanner"
                    className="flex items-center gap-2 rounded-xl bg-gradient-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-glow"
                  >
                    <Scan className="h-5 w-5" /> Scan your code
                  </Link>
                </Magnetic>
                <Magnetic strength={0.25}>
                  <Link
                    to="/register"
                    className="rounded-xl border border-border bg-secondary/30 px-7 py-3.5 font-semibold transition-colors hover:border-primary/60 hover:text-primary"
                  >
                    Create free account
                  </Link>
                </Magnetic>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
