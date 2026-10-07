"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import SectionHeading from "./SectionHeading";
import EmptyState from "@/components/EmptyState";
import { memoryKindMeta, type OnThisDay } from "@/lib/types";
import { thumb } from "@/lib/image-url";

interface OnThisDaySectionProps {
  data: OnThisDay;
}

/** 「那年今日」：同月同日留下的记录，横向卡片墙。 */
export default function OnThisDaySection({ data }: OnThisDaySectionProps) {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          supertitle="On This Day"
          title="那年今日"
          subtitle={`${data.monthDay} —— 这一天，你们留下过这些回响。`}
        />

        {!data.hasContent ? (
          <EmptyState
            icon="🕰️"
            title="今天还没有历史的回响"
            description="等日子再走一程，这里会悄悄长出你们的回忆。"
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.memories.map((m, i) => {
              const meta = memoryKindMeta[m.kind];
              return (
                <motion.div
                  key={`${m.kind}-${m.date}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: (i % 4) * 0.06, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Link
                    href={m.href}
                    className="card card-interactive p-4 flex flex-col gap-3 h-full"
                  >
                    {m.src ? (
                      <div className="aspect-[4/3] rounded overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb(m.src, 480)} alt={m.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded flex items-center justify-center text-3xl bg-bg-secondary/60">
                        {meta.emoji}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{meta.emoji}</span>
                      <span className="text-[10px] tracking-[0.2em] uppercase text-page-supertitle">
                        {meta.label}
                      </span>
                    </div>
                    <div>
                      <p className="font-display-serif text-sm font-medium text-page-heading leading-snug line-clamp-2">
                        {m.title}
                      </p>
                      <p className="text-[11px] mt-1 tracking-wider text-page-subtitle line-clamp-1">
                        {m.year} · {m.date.slice(5)}
                        {m.subtitle ? ` · ${m.subtitle}` : ""}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
