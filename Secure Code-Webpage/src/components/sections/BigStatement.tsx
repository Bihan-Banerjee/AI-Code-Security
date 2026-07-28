import Reveal from "@/components/effects/Reveal";

/** Auros-style oversized closing statement headline. */
export default function BigStatement() {
  return (
    <section className="relative py-24 text-center lg:py-32">
      <div className="mx-auto max-w-5xl px-4">
        <Reveal>
          <h2 className="font-display text-4xl font-medium leading-[1.02] tracking-[-0.03em] text-primary sm:text-5xl lg:text-6xl">
            Helping developers ship with confidence.
          </h2>
        </Reveal>
      </div>
    </section>
  );
}
