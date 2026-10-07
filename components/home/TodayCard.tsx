"use client";

import { motion } from "framer-motion";
import { getDaysSince } from "@/lib/data";
import { MONTHLY_NOTES } from "@/lib/config";

interface TodayCardProps {
  startDate: string;
  relationshipDate: string;
}

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/** 「今天」卡片：日期 / 星期 + 在一起 / 相识天数 + 一句今日寄语。 */
export default function TodayCard({ startDate, relationshipDate }: TodayCardProps) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();
  const weekday = WEEKDAYS[now.getDay()];
  const togetherDays = getDaysSince(relationshipDate);
  const knownDays = getDaysSince(startDate);
  const note = MONTHLY_NOTES[now.getMonth()];

  return (
    <section className="relative py-16 md:py-20">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="card p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-8 md:gap-12"
        >
          {/* 日期 */}
          <div className="flex items-baseline gap-3 md:gap-4">
            <span className="font-display-serif text-5xl md:text-7xl font-bold tracking-[-0.02em] text-page-heading tabular-nums">
              {month}
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] tracking-[0.3em] uppercase text-page-supertitle">
                {weekday}
              </span>
              <span className="font-display-serif text-5xl md:text-7xl font-bold tracking-[-0.02em] text-page-heading tabular-nums">
                {day}
              </span>
              <span className="text-[11px] tracking-[0.3em] uppercase text-page-supertitle">
                {year}
              </span>
            </div>
          </div>

          {/* 分隔线（桌面竖线 / 移动横线） */}
          <div className="hidden md:block w-px self-stretch bg-page-footer-border" />

          {/* 天数 + 寄语 */}
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-4">
              <div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-page-supertitle mb-1">在一起</p>
                <p className="text-3xl md:text-4xl font-light tracking-tight text-page-heading tabular-nums">
                  {togetherDays} <span className="text-sm text-page-subtitle">天</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-page-supertitle mb-1">相识</p>
                <p className="text-3xl md:text-4xl font-light tracking-tight text-page-heading tabular-nums">
                  {knownDays} <span className="text-sm text-page-subtitle">天</span>
                </p>
              </div>
            </div>
            <p className="font-display-serif text-sm md:text-base text-page-subtitle leading-relaxed">
              {note}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
