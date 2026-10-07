"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getDaysSince, formatDate } from "@/lib/data";
import { SITE } from "@/lib/config";
import { useTheme } from "@/hooks/useTheme";

interface HeroProps {
  startDate: string;
  relationshipDate: string;
  counts: {
    totalEntries: number;
    totalVideos: number;
    totalPhotos: number;
    totalMilestones: number;
  };
}

export default function Hero({
  startDate,
  relationshipDate,
  counts,
}: HeroProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const days = getDaysSince(startDate);
  const togetherDays = getDaysSince(relationshipDate);

  // ---- Mouse parallax ----
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  // Parallax offsets: map 0-1 → small pixel range
  const glowX = (mousePos.x - 0.5) * 30;
  const glowY = (mousePos.y - 0.5) * 30;
  const megaX = (mousePos.x - 0.5) * -20;
  const megaY = (mousePos.y - 0.5) * -20;

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Conic gradient glow — theme-aware */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ x: glowX, y: glowY }}
          transition={{ type: "spring", stiffness: 150, damping: 30, mass: 0.5 }}
          className={`w-[900px] h-[900px] animate-sexy-light rounded-full ${
            isDark
              ? "bg-sexy-light opacity-50"
              : "bg-sexy-light opacity-40"
          }`}
        />
      </div>

      {/* Mega decorative "LOVE" text */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <motion.span
          animate={{ x: megaX, y: megaY }}
          transition={{ type: "spring", stiffness: 100, damping: 40, mass: 1 }}
          className={`text-[25vw] font-bold leading-none tracking-[-0.05em] select-none ${
            isDark
              ? "text-white/5"
              : "text-[#3D3533]/8"
          }`}
        >
          LOVE
        </motion.span>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        {/* Super title */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="supertitle mb-8 text-hero-supertitle"
        >
          {SITE.supertitle}
        </motion.p>

        {/* Main heading — gradient text + glow */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-[12vw] md:text-[8rem] font-bold leading-[0.9] tracking-[-0.02em] mb-6"
        >
          <span className="text-gradient-amber">{SITE.name}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-base md:text-lg font-light tracking-wider mb-3 text-hero-subtitle"
        >
          {SITE.tagline}
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="text-sm max-w-md mx-auto leading-relaxed tracking-wider mb-16 text-hero-desc"
        >
          {SITE.description}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mb-24"
        >
          <Link
            href="/timeline"
            className="btn-capsule text-xs tracking-[0.2em] inline-flex items-center gap-2 group"
          >
            进入档案馆
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto"
        >
          {[
            { value: days, label: "已记录天数" },
            { value: counts.totalEntries, label: "日记篇数" },
            { value: counts.totalPhotos, label: "照片" },
            { value: counts.totalMilestones, label: "重要节点" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.08 }}
              className="card p-4 text-center"
            >
              <p className="text-2xl md:text-3xl font-light tracking-tight text-hero-heading">
                {item.value}
              </p>
              <p className="text-[11px] mt-1.5 tracking-wider text-hero-desc">
                {item.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Together days counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.15 }}
          className="mt-8"
        >
          <div className="inline-flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] tracking-[0.2em] uppercase text-hero-together-label">
                在一起
              </span>
              <span className="text-5xl md:text-6xl font-light tracking-[-0.02em] tabular-nums text-hero-together-number">
                {togetherDays}
              </span>
              <span className="text-[11px] tracking-[0.2em] uppercase text-hero-together-label">
                天
              </span>
            </div>
            <div className="w-12 h-[1px] mt-2 bg-hero-together-line" />
            <p className="text-[11px] tracking-widest mt-2 text-hero-together-since">
              始于 {relationshipDate.replace(/-/g, ".")}
            </p>
          </div>
        </motion.div>

        {/* Start date */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.3 }}
          className="text-[11px] mt-12 tracking-widest text-hero-start-date"
        >
          相识于 {formatDate(startDate)}
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="text-[11px] tracking-[0.3em] uppercase text-hero-scroll-text">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-[1px] h-10 bg-gradient-to-b from-hero-scroll-line-from to-transparent"
        />
      </motion.div>
    </section>
  );
}
