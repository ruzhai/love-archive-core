"use client";

import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { type UpcomingAnniversary } from "@/lib/anniversaries";

interface AnniversarySectionProps {
  anniversaries: UpcomingAnniversary[];
}

function yearsLabel(a: UpcomingAnniversary): string {
  if (a.yearsPassed <= 0) return "";
  return `${a.yearsPassed} 周年`;
}

/** 「纪念日倒数」：下一个纪念日的醒目倒计时 + 全部纪念日一览。 */
export default function AnniversarySection({ anniversaries }: AnniversarySectionProps) {
  const next = anniversaries[0];
  const rest = anniversaries.slice(1);

  return (
    <section className="relative py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          supertitle="Countdown"
          title="纪念日倒数"
          subtitle="把每一个值得纪念的日子，都提前放在心上。"
        />

        {next && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="card p-8 md:p-12 mb-4 text-center"
          >
            <p className="text-4xl md:text-5xl mb-4">{next.emoji}</p>
            <p className="text-[11px] tracking-[0.3em] uppercase text-page-supertitle mb-3">
              {next.isToday ? "就是今天" : "下一个纪念日"}
            </p>
            <h3 className="font-display-serif text-2xl md:text-3xl font-bold text-page-heading mb-4">
              {next.title}
            </h3>

            {next.isToday ? (
              <p className="font-display-serif text-5xl md:text-7xl font-bold tracking-tight text-page-heading">
                🎉
              </p>
            ) : (
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-display-serif text-6xl md:text-8xl font-bold tracking-tight tabular-nums text-page-heading">
                  {next.daysLeft}
                </span>
                <span className="text-sm tracking-widest text-page-subtitle">天后</span>
              </div>
            )}

            <p className="text-sm mt-5 tracking-wider text-page-subtitle">
              {next.nextDate}
              {yearsLabel(next) ? ` · 第 ${yearsLabel(next)}` : ""}
              {next.description ? ` · ${next.description}` : ""}
            </p>
          </motion.div>
        )}

        {/* 全部纪念日 */}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {rest.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                className="card p-5 flex items-center gap-4"
              >
                <span className="text-2xl">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display-serif text-sm font-medium text-page-heading truncate">
                    {a.title}
                  </p>
                  <p className="text-[11px] mt-0.5 tracking-wider text-page-subtitle">
                    {a.monthDay}
                    {yearsLabel(a) ? ` · ${yearsLabel(a)}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-light tabular-nums text-page-heading">{a.daysLeft}</p>
                  <p className="text-[10px] tracking-wider text-page-supertitle">天</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
