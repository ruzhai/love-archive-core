"use client";

import { motion } from "framer-motion";

interface PageHeaderProps {
  /** 英文小字眉题，如 "Love Data" / "Chapter 03" */
  supertitle?: string;
  /** 中文衬线大标题 */
  title: string;
  /** 标题下方副文案 */
  subtitle?: string;
  /** 标题右侧的英文陪衬（衬线小字），如 "TIMELINE" */
  en?: string;
  align?: "left" | "center";
  className?: string;
}

/**
 * 全站统一页头：supertitle（眉题）+ 衬线大标题 + 副标题。
 * 颜色全部走设计令牌（--page-supertitle/heading/subtitle），
 * 深色「暗夜档案馆」与浅色「暖纸书信」自动切换，不再写 isDark 条件。
 */
export default function PageHeader({
  supertitle,
  title,
  subtitle,
  en,
  align = "left",
  className = "",
}: PageHeaderProps) {
  const isCenter = align === "center";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      className={`mb-20 ${isCenter ? "text-center" : ""} ${className}`}
    >
      {supertitle && (
        <div
          className={`flex items-center gap-3 mb-4 ${
            isCenter ? "justify-center" : "justify-start"
          }`}
        >
          <span className="h-px w-8 bg-page-supertitle/60" aria-hidden="true" />
          <p className="text-[11px] tracking-[0.3em] uppercase text-page-supertitle">
            {supertitle}
          </p>
          {isCenter && (
            <span className="h-px w-8 bg-page-supertitle/60" aria-hidden="true" />
          )}
        </div>
      )}

      <div className={isCenter ? "" : "flex items-end gap-4 flex-wrap"}>
        <h1 className="font-display-serif text-5xl md:text-7xl font-bold tracking-[-0.02em] text-page-heading">
          {title}
        </h1>
        {en && (
          <span className="font-display-serif-en text-sm md:text-base tracking-[0.35em] uppercase text-page-supertitle/70 pb-2">
            {en}
          </span>
        )}
      </div>

      {subtitle && (
        <p
          className={`text-sm leading-relaxed tracking-wider font-light text-page-subtitle mt-4 ${
            isCenter ? "max-w-md mx-auto" : "max-w-md"
          }`}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
