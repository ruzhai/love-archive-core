"use client";

import { motion } from "framer-motion";

interface SectionHeadingProps {
  supertitle: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

/** 首页大厅各区块的统一小节标题：眉题 + 衬线标题 + 副文案。 */
export default function SectionHeading({
  supertitle,
  title,
  subtitle,
  align = "left",
}: SectionHeadingProps) {
  const isCenter = align === "center";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className={`mb-10 ${isCenter ? "text-center" : ""}`}
    >
      <div className={`flex items-center gap-3 mb-3 ${isCenter ? "justify-center" : ""}`}>
        <span className="h-px w-7 bg-page-supertitle/60" aria-hidden="true" />
        <p className="text-[11px] tracking-[0.3em] uppercase text-page-supertitle">
          {supertitle}
        </p>
      </div>
      <h2 className="font-display-serif text-3xl md:text-4xl font-bold tracking-[-0.02em] text-page-heading">
        {title}
      </h2>
      {subtitle && (
        <p className={`text-sm mt-3 leading-relaxed tracking-wider font-light text-page-subtitle max-w-lg ${isCenter ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
