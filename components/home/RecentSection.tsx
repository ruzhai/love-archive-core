"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import SectionHeading from "./SectionHeading";
import EmptyState from "@/components/EmptyState";
import { formatDateShort } from "@/lib/data";
import type { RecentActivity } from "@/lib/home";
import { thumb } from "@/lib/image-url";

interface RecentSectionProps {
  recent: RecentActivity;
}

/** 「最近动态」：最新日记 / 照片 / 视频 / 节点，bento 网格。 */
export default function RecentSection({ recent }: RecentSectionProps) {
  const { entry, photo, video, event } = recent;
  const hasAny = !!(entry || photo || video || event);

  return (
    <section className="relative py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          supertitle="Recently"
          title="最近动态"
          subtitle="档案馆里，最近又多了些什么。"
        />

        {!hasAny ? (
          <EmptyState
            icon="🌱"
            title="还没有动态"
            description="去写下第一篇日记，或上传第一张照片吧。"
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[minmax(120px,auto)]">
            {/* 照片（大卡） */}
            {photo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="md:col-span-2 md:row-span-2"
              >
                <Link href="/gallery" className="card card-interactive p-0 overflow-hidden h-full relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(photo.src, 480)} alt={photo.caption} className="w-full h-full min-h-[160px] object-cover" loading="lazy" decoding="async" />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/70">📷 照片</p>
                    <p className="font-display-serif text-sm text-white line-clamp-1">{photo.caption || "一张照片"}</p>
                    <p className="text-[11px] text-white/60">{formatDateShort(photo.date)}</p>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* 日记 */}
            {entry && (
              <CardLink href="/diary" delay={0.05}>
                <p className="text-[10px] tracking-[0.2em] uppercase text-page-supertitle">📖 日记</p>
                <p className="font-display-serif text-sm font-medium text-page-heading line-clamp-2 mt-1">{entry.title}</p>
                <p className="text-[11px] mt-1 tracking-wider text-page-subtitle line-clamp-2">{entry.summary}</p>
                <p className="text-[11px] mt-2 text-page-supertitle">{formatDateShort(entry.date)}</p>
              </CardLink>
            )}

            {/* 视频 */}
            {video && (
              <CardLink href="/videos" delay={0.1}>
                <p className="text-[10px] tracking-[0.2em] uppercase text-page-supertitle">🎬 视频</p>
                <p className="font-display-serif text-sm font-medium text-page-heading line-clamp-2 mt-1">{video.title}</p>
                <p className="text-[11px] mt-2 text-page-supertitle">{formatDateShort(video.date)}</p>
              </CardLink>
            )}

            {/* 节点 */}
            {event && (
              <CardLink href="/timeline" delay={0.15}>
                <p className="text-[10px] tracking-[0.2em] uppercase text-page-supertitle">⚓ 节点</p>
                <p className="font-display-serif text-sm font-medium text-page-heading line-clamp-2 mt-1">{event.title}</p>
                <p className="text-[11px] mt-1 tracking-wider text-page-subtitle line-clamp-2">{event.description}</p>
                <p className="text-[11px] mt-2 text-page-supertitle">{formatDateShort(event.date)}</p>
              </CardLink>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function CardLink({ href, delay = 0, children }: { href: string; delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className="h-full"
    >
      <Link href={href} className="card card-interactive p-5 flex flex-col h-full">
        {children}
      </Link>
    </motion.div>
  );
}
