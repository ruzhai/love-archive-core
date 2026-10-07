"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export type CardVariant = "default" | "gradient-border" | "elevated" | "subtle";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  delay?: number;
  padding?: "sm" | "md" | "lg";
  variant?: CardVariant;
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8 md:p-10",
};

const variantClasses: Record<CardVariant, string> = {
  default: "",
  "gradient-border": "gradient-border",
  elevated:
    "shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02]",
  subtle: "bg-white/[0.02] border-white/[0.04]",
};

export default function GlassCard({
  children,
  className = "",
  interactive = false,
  delay = 0,
  padding = "md",
  variant = "default",
}: GlassCardProps) {
  const variantClass = variantClasses[variant];
  const baseClasses = [
    "card",
    interactive ? "card-interactive" : "",
    paddingMap[padding],
    variantClass,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className={`${baseClasses} ${className}`}
    >
      {children}
    </motion.div>
  );
}
