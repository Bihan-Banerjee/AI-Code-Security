import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useIsTouch } from "@/hooks/useIsTouch";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, [data-cursor="pointer"]';

export default function CustomCursor() {
  const isTouch = useIsTouch();
  const reduced = useReducedMotion();
  const enabled = !isTouch && !reduced;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 350, damping: 28, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 350, damping: 28, mass: 0.6 });

  const [hovering, setHovering] = useState(false);
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      document.body.removeAttribute("data-custom-cursor");
      return;
    }
    document.body.setAttribute("data-custom-cursor", "true");

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      if (!visible) setVisible(true);
      setHovering(!!(e.target as Element)?.closest?.(INTERACTIVE));
    };
    const downFn = () => setDown(true);
    const upFn = () => setDown(false);
    const leave = () => setVisible(false);

    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", downFn);
    window.addEventListener("mouseup", upFn);
    document.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", downFn);
      window.removeEventListener("mouseup", upFn);
      document.removeEventListener("mouseleave", leave);
      document.body.removeAttribute("data-custom-cursor");
    };
  }, [enabled, x, y, visible]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]" aria-hidden style={{ opacity: visible ? 1 : 0 }}>
      {/* Lagging ring */}
      <motion.div
        className="absolute rounded-full border border-primary/70"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: hovering ? 56 : 34,
          height: hovering ? 56 : 34,
          opacity: down ? 0.4 : 0.9,
          boxShadow: hovering ? "0 0 24px -4px hsl(var(--primary) / 0.8)" : "0 0 0px transparent",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      />
      {/* Precise dot */}
      <motion.div
        className="absolute h-1.5 w-1.5 rounded-full bg-primary"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{ scale: down ? 0.6 : 1 }}
      />
    </div>
  );
}
