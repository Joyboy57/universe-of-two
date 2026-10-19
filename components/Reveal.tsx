"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HeartBurst } from "./HeartBurst";

/** Fades in, and floats hearts the first time this reveal is opened on this device. */
export function Reveal({ id, children }: { id: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(id)) {
        localStorage.setItem(id, "1");
        setBurst(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, [id]);

  return (
    <motion.div
      className="relative"
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {burst && <HeartBurst />}
      {children}
    </motion.div>
  );
}
