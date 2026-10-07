"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: string;
  subtitle?: string;
  delay?: number;
  large?: boolean;
}

export default function StatsCard({
  label,
  value,
  icon,
  subtitle,
  delay = 0,
  large = false,
}: StatsCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const valueColor = isDark ? "text-white" : "text-[#3D3533]";
  const labelColor = isDark ? "text-white/25" : "text-[#3D3533]/35";
  const subtitleColor = isDark ? "text-white/12" : "text-[#3D3533]/18";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className={`card p-6 text-center ${large ? "md:col-span-2" : ""}`}
    >
      {icon && <p className="text-xl mb-3 opacity-50">{icon}</p>}
      <motion.p
        initial={{ scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: delay + 0.1 }}
        className={`font-light tracking-tight ${
          large ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl"
        } ${valueColor}`}
      >
        {value}
      </motion.p>
      <p className={`text-[12px] mt-2 tracking-wider ${labelColor}`}>
        {label}
      </p>
      {subtitle && (
        <p className={`text-[11px] mt-1 tracking-wider ${subtitleColor}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
