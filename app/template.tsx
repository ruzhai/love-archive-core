"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Page transition — overlapping "sink and rise" crossfade.
 *
 * Outgoing: sinks down (y 0→80px), scales slightly (1→1.08), fades out. 0.6s
 * Incoming: rises from below (y 60→0), snaps to normal (1.08→1), fades in. 0.35s
 *
 * mode="sync" runs both simultaneously — the new page rises over the old
 * one as it sinks away, creating a fluid, continuous-feeling transition.
 */

const easeOut: [number, number, number, number] = [0.4, 0, 0.2, 1];

const variants: Variants = {
  initial: {
    opacity: 0,
    scale: 1.08,
    y: 60,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.08,
    y: 80,
    transition: {
      duration: 0.6,
      ease: easeOut,
    },
  },
};

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
