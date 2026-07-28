import { Link } from "react-router-dom";
import { Scan, ArrowUpRight } from "lucide-react";
import ParticleSphere from "@/components/effects/ParticleSphere";
import Magnetic from "@/components/effects/Magnetic";
import Reveal from "@/components/effects/Reveal";

export default function Hero() {
  return (
    <section className="relative flex min-h-[92vh] flex-col items-center overflow-hidden px-4 pt-24 text-center">
      {/* Radial teal spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 38% 42%, hsl(177 100% 25% / 0.5), transparent 70%)",
        }}
      />

      {/* Hero copy */}
      <div className="relative z-10 mx-auto max-w-4xl">
        <Reveal>
          <p className="text-[12px] font-medium uppercase tracking-[0.32em] text-muted-foreground">FortiScan</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1
            className="mt-6 font-display font-medium leading-[0.98] tracking-[-0.04em] text-foreground"
            style={{ fontSize: "clamp(36px, 7vw, 78px)" }}
          >
            Make your code
            <br />
            <span className="text-gradient">secure by default</span>
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            AI-assisted scanning and deterministic fixes for Python &amp; JavaScript, built on Bandit and Semgrep.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Magnetic strength={0.35}>
              <Link
                to="/scanner"
                className="btn-current inline-flex items-center gap-2 rounded-md px-7 py-3.5 text-[12px] font-medium uppercase tracking-[0.12em]"
              >
                <Scan className="h-4 w-4" /> Start Security Scan <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <a
                href="#demo"
                className="btn-ghost-grad inline-flex items-center gap-2 rounded-md px-7 py-3.5 text-[12px] font-medium uppercase tracking-[0.12em]"
              >
                See it in action
              </a>
            </Magnetic>
          </div>
        </Reveal>
      </div>

      {/* Particle sphere centerpiece — sits low and bleeds off the bottom, disperses on scroll */}
      <div className="pointer-events-none absolute bottom-[-22%] left-1/2 h-[70vh] w-[70vh] max-w-[760px] -translate-x-1/2">
        <ParticleSphere className="h-full w-full" />
      </div>
    </section>
  );
}
