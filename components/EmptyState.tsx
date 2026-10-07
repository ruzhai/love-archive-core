"use client";

import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * 全站统一空状态：emoji 图标 + 标题 + 说明 +（可选）操作按钮。
 * 颜色走令牌（--page-heading / --page-subtitle），双主题自动适配。
 */
export default function EmptyState({
  icon = "🕊️",
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`card p-10 md:p-14 text-center ${className}`}
    >
      <p className="text-4xl mb-5 opacity-40 select-none" aria-hidden="true">
        {icon}
      </p>
      <h3 className="font-display-serif text-lg md:text-xl text-page-heading mb-3">
        {title}
      </h3>
      {description && (
        <p className="text-sm tracking-wider leading-relaxed text-page-subtitle max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
