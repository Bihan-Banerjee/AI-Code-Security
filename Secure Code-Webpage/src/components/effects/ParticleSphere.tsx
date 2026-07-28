import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Bioluminescent particle sphere — the Auros-style hero centerpiece.
 * A Fibonacci-distributed cloud of glowing teal points that slowly rotates,
 * tilts toward the cursor, and DISPERSES as the user scrolls the hero
 * (particles burst outward and fade). Canvas-based, disabled under reduced motion.
 */
export default function ParticleSphere({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const N = 900;
    const pts: { x: number; y: number; z: number; dx: number; dy: number; dz: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = golden * i;
      const x = Math.cos(t) * r;
      const z = Math.sin(t) * r;
      // per-point random burst direction (biased upward, like Auros)
      pts.push({
        x, y, z,
        dx: (Math.random() - 0.5) * 2.2,
        dy: -Math.random() * 2.4 - 0.3,
        dz: (Math.random() - 0.5) * 2.2,
      });
    }

    let w = 0, h = 0, R = 0, raf = 0;
    let autoYaw = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let disp = 0, dispTarget = 0;
    const readHsl = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "176 72% 46%";
    let hsl = readHsl();

    const resize = () => {
      const rect = (canvas.parentElement || canvas).getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(w, h) * 0.42;
      hsl = readHsl();
    };

    const onScroll = () => {
      dispTarget = Math.min(1, window.scrollY / (window.innerHeight * 0.7));
    };

    const tick = () => {
      autoYaw += 0.0022;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      disp += (dispTarget - disp) * 0.08;
      const ry = autoYaw + mouse.x * 0.7;
      const rx = mouse.y * 0.5;
      const cosY = Math.cos(ry), sinY = Math.sin(ry);
      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const cx = w / 2, cy = h / 2;
      const burst = disp * disp; // ease-in
      const fade = 1 - Math.min(1, disp * 1.15);

      ctx.clearRect(0, 0, w, h);
      if (fade <= 0.01) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const proj = pts.map((p) => {
        const px = p.x + p.dx * burst;
        const py = p.y + p.dy * burst;
        const pz = p.z + p.dz * burst;
        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;
        const y1 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;
        const persp = 1 / (2 - Math.max(-0.95, z2));
        return { sx: cx + x1 * R * persp, sy: cy + y1 * R * persp, z: z2 };
      });
      proj.sort((a, b) => a.z - b.z);

      for (const p of proj) {
        const depth = (p.z + 1) / 2;
        const alpha = (0.18 + depth * 0.82) * fade;
        const size = 0.5 + depth * 1.9;
        ctx.beginPath();
        ctx.fillStyle = `hsl(${hsl} / ${alpha})`;
        ctx.shadowColor = `hsl(${hsl} / ${alpha})`;
        ctx.shadowBlur = depth * 7;
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
      mouse.ty = (e.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };

    resize();
    onScroll();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <div className={`grid place-items-center ${className}`} aria-hidden>
        <div className="h-1/2 w-1/2 rounded-full border border-primary/30" />
      </div>
    );
  }

  return <canvas ref={ref} aria-hidden className={className} />;
}
