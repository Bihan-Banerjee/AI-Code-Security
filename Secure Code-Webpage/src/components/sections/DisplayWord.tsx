import Reveal from "@/components/effects/Reveal";

/** Auros-style oversized display word followed by a large statement line. */
export default function DisplayWord() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-4">
        <Reveal>
          <h2
            className="whitespace-nowrap font-display font-medium leading-[0.85] tracking-[-0.05em] text-foreground"
            style={{ fontSize: "clamp(80px, 19vw, 260px)" }}
          >
            Secure<span className="text-primary">.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-8 max-w-3xl font-display text-2xl font-medium leading-[1.15] tracking-[-0.02em] text-primary sm:text-3xl lg:text-4xl">
            FortiScan is an AI-assisted security toolkit that finds vulnerabilities, explains the risk, and applies
            deterministic fixes, so you can ship fast without shipping flaws.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
