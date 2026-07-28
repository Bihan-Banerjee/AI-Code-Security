import { useEffect, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIsTouch } from "@/hooks/useIsTouch";

/** Translates its children based on the pointer position relative to the viewport center. */
export default function Parallax({
  children,
  depth = 20,
  className = "",
}: {
  children: ReactNode;
  depth?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const isTouch = useIsTouch();
  const enabled = !reduced && !isTouch;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 70, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 70, damping: 22, mass: 0.6 });

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => {
      const rx = e.clientX / window.innerWidth - 0.5;
      const ry = e.clientY / window.innerHeight - 0.5;
      x.set(rx * depth);
      y.set(ry * depth);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [enabled, depth, x, y]);

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} style={{ x: sx, y: sy }}>
      {children}
    </motion.div>
  );
}
