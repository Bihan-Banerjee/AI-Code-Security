import { useEffect, useRef } from "react";
import { animate, createDrawable, stagger } from "animejs";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Full-screen branded loader. anime.js draws the shield + lock SVG strokes with
 * a scanning sweep. Falls back to a static mark when reduced motion is requested.
 * Used as the Suspense fallback and the initial app boot loader.
 */
export default function PageLoader({ label = "Securing your session" }: { label?: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !svgRef.current) return;
    const paths = svgRef.current.querySelectorAll<SVGPathElement>(".draw");
    const drawables = createDrawable(Array.from(paths));
    const anim = animate(drawables, {
      draw: ["0 0", "0 1", "1 1"],
      ease: "inOutSine",
      duration: 2000,
      delay: stagger(180),
      loop: true,
    });
    return () => anim.pause();
  }, [reduced]);

  return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" aria-hidden />
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          {/* scanning sweep */}
          {!reduced && (
            <span className="absolute left-0 right-0 top-0 h-10 animate-scan-line bg-gradient-to-b from-primary/40 to-transparent blur-md" />
          )}
          <svg
            ref={svgRef}
            width="96"
            height="96"
            viewBox="0 0 100 100"
            fill="none"
            className="relative drop-shadow-[0_0_24px_hsl(var(--primary)/0.6)]"
          >
            <path
              className="draw"
              d="M50 8 L86 22 V50 C86 72 70 86 50 92 C30 86 14 72 14 50 V22 Z"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              className="draw"
              d="M42 50 H58 M42 50 V42 a8 8 0 0 1 16 0 V50 M42 50 V64 H58 V50"
              stroke="hsl(var(--accent))"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm tracking-widest text-muted-foreground">{label}</span>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: `glow-pulse 1.2s ${i * 0.18}s ease-in-out infinite` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
