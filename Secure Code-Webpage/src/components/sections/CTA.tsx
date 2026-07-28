import { Link } from "react-router-dom";
import { Scan, ArrowUpRight } from "lucide-react";
import Reveal from "@/components/effects/Reveal";
import Magnetic from "@/components/effects/Magnetic";
import Eyebrow from "@/components/Eyebrow";

export default function CTA() {
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4">
        <Reveal direction="scale">
          <div className="relative overflow-hidden rounded-2xl bg-secondary p-10 text-center sm:p-16">
            <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
            <div className="relative mx-auto max-w-2xl space-y-6">
              <div className="flex justify-center"><Eyebrow>Start in seconds</Eyebrow></div>
              <h2 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
                Find and fix vulnerabilities <span className="text-gradient">before they ship</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Run your first scan now. No setup, no credit card. Just paste your code.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Magnetic strength={0.35}>
                  <Link
                    to="/scanner"
                    className="btn-current inline-flex h-11 items-center justify-center gap-2 rounded-md px-7 text-[12px] font-medium uppercase tracking-[0.12em]"
                  >
                    <Scan className="h-4 w-4" /> Scan your code <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Magnetic>
                <Magnetic strength={0.25}>
                  <Link
                    to="/register"
                    className="btn-ghost-grad inline-flex h-11 items-center justify-center gap-2 rounded-md px-7 text-[12px] font-medium uppercase tracking-[0.12em]"
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
