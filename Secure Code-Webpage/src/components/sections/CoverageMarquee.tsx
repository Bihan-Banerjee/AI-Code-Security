const ITEMS = [
  "Bandit", "Semgrep", "CWE-89 SQLi", "CWE-79 XSS", "CWE-78 Command Inj",
  "CWE-502 Deserialization", "CWE-327 Weak Crypto", "CWE-798 Hardcoded Secret",
  "CWE-22 Path Traversal", "CWE-94 Code Injection", "Python", "JavaScript",
];

export default function CoverageMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-card/20 py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div className="group flex w-max">
        <div className="flex shrink-0 animate-marquee items-center gap-4 pr-4 group-hover:[animation-play-state:paused]">
          {[...ITEMS, ...ITEMS].map((item, i) => (
            <span
              key={i}
              className="cursor-default whitespace-nowrap rounded-lg border border-border/70 bg-secondary/40 px-4 py-2 font-mono text-sm text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary hover:shadow-glow-sm"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
