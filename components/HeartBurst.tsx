"use client";
import { motion, useReducedMotion } from "framer-motion";

const HEARTS = [
  { x: -26, delay: 0, size: 14 }, { x: -12, delay: 0.06, size: 18 }, { x: 0, delay: 0.02, size: 22 },
  { x: 12, delay: 0.1, size: 16 }, { x: 26, delay: 0.04, size: 14 }, { x: -18, delay: 0.14, size: 12 },
  { x: 18, delay: 0.12, size: 12 },
];

/** Hearts float up from the parent (parent must be position: relative). Remount via `key` to replay. */
export function HeartBurst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex justify-center" aria-hidden="true">
      {HEARTS.map((h, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ color: "var(--accent)", fontSize: h.size }}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], y: -70 - (i % 3) * 18, x: h.x, scale: [0.4, 1.1, 0.9] }}
          transition={{ duration: 1.3, delay: h.delay, ease: "easeOut" }}
        >
          ♥
        </motion.span>
      ))}
    </span>
  );
}
