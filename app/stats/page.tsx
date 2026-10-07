"use client";

import { motion } from "framer-motion";
import { getDaysSince, getRelationshipDate, formatDate } from "@/lib/data";
import { DATES, AUTHORS, authorLabel } from "@/lib/config";
import StatsCard from "@/components/StatsCard";
import PageHeader from "@/components/PageHeader";
import { useEventLibrary } from "@/hooks/useEventLibrary";
import { usePhotoLibrary } from "@/hooks/usePhotoLibrary";
import { useVideoLibrary } from "@/hooks/useVideoLibrary";
import { useTimelineLibrary } from "@/hooks/useTimelineLibrary";
import { useMemo } from "react";

export default function StatsPage() {
  const { events } = useEventLibrary();
  const { photos } = usePhotoLibrary();
  const { videos } = useVideoLibrary();
  const { events: milestones } = useTimelineLibrary();

  const daysCount = getDaysSince(DATES.startDate);
  const togetherDays = getDaysSince(getRelationshipDate());

  // Every number on this page is counted from the live library — nothing here
  // reads a pre-baked stats file, so it stays correct as content is added.
  const monthlyActivity = useMemo(() => {
    const map = new Map<string, { month: string; events: number; messages: number }>();
    const bump = (date: string, field: "events" | "messages") => {
      const month = (date || "").slice(0, 7);
      if (!month) return;
      if (!map.has(month)) map.set(month, { month, events: 0, messages: 0 });
      map.get(month)![field]++;
    };
    for (const e of events) bump(e.date, "events");
    for (const p of photos) bump(p.date, "messages");
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [events, photos]);

  const eventTypes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ev of milestones) {
      const t = ev.type || "other";
      map[t] = (map[t] || 0) + 1;
    }
    return map;
  }, [milestones]);

  // Keywords from actual diary content (not static chat data)
  const topKeywords = useMemo(() => {
    // Collect all diary text, strip markdown, and segment into CJK words
    const allText: string[] = [];
    for (const e of events) {
      // Strip markdown syntax
      const stripMd = (t: string) => t.replace(/[*_#\[\]\(\)`>\-!|~]/g, "").replace(/\n+/g, " ");
      if (e.content_author1) allText.push(stripMd(e.content_author1));
      if (e.content_author2) allText.push(stripMd(e.content_author2));
    }
    const combined = allText.join(" ");

    // Simple CJK bigram extraction: slide 2-char window for Chinese text
    const freq = new Map<string, number>();
    const cjk = /[一-鿿㐀-䶿]/;
    // Count 2-char bigrams
    for (let i = 0; i < combined.length - 1; i++) {
      if (cjk.test(combined[i]) && cjk.test(combined[i + 1])) {
        const bigram = combined[i] + combined[i + 1];
        freq.set(bigram, (freq.get(bigram) || 0) + 1);
      }
    }
    // Also count individual 2+ char CJK words (simple split by non-CJK)
    const words = combined.split(/[^一-鿿㐀-䶿]+/).filter(w => w.length >= 2);
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }

    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ word, count }));
  }, [events]);

  // Count characters contributed by each author — from the stats start date only
  const { author1Chars, author2Chars } = useMemo(() => {
    const countChars = (text: string) => {
      const matches = text.match(/[一-鿿㐀-䶿a-zA-Z0-9]/g);
      return matches ? matches.length : 0;
    };
    // Count cumulative diary contribution since the relationship start date.
    // NOTE: this used to be `new Date()` (today), which excluded every entry
    // written before today — so the total silently reset to 0 whenever the
    // date rolled over. startDate is fixed, so the running total is stable.
    const cutoff = DATES.startDate;
    let r = 0, f = 0;
    for (const e of events) {
      if (e.date < cutoff && e.createdAt.slice(0, 10) < cutoff) continue;
      r += countChars(e.content_author1 || "");
      f += countChars(e.content_author2 || "");
    }
    return { author1Chars: r, author2Chars: f };
  }, [events]);
  const totalChars = author1Chars + author2Chars || 1;

  const maxEvents = Math.max(...monthlyActivity.map((m) => m.events), 1);
  const maxMessages = Math.max(...monthlyActivity.map((m) => m.messages), 1);
  const maxKeyword = Math.max(...topKeywords.map((k) => k.count), 1);

  const eventLabels: Record<string, string> = {
    first_chat: "第一次聊天",
    first_video_call: "第一次视频",
    first_meeting: "第一次见面",
    first_hold_hands: "第一次牵手",
    official: "在一起",
    holiday: "节日",
    special_moment: "特别时刻",
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="container-page">
        {/* Page header */}
        <PageHeader
          supertitle="Love Data"
          title="数据分析"
          subtitle="用数字的方式，看看我们走了多远。"
        />

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          <StatsCard label="已相识天数" value={daysCount} icon="📅" delay={0} />
          <StatsCard label="日记篇数" value={events.length} icon="📝" delay={0.08} />
          <StatsCard label="照片数量" value={photos.length} icon="📷" delay={0.16} />
          <StatsCard label="视频回忆" value={videos.length} icon="🎬" delay={0.24} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16">
          <StatsCard label="重要节点" value={milestones.length} icon="⚓" delay={0.32} />
          <StatsCard label="相伴天数" value={togetherDays} icon="✉️" delay={0.4} />
          <StatsCard
            label="起始日期"
            value={formatDate(DATES.startDate)}
            icon="❤️"
            delay={0.48}
            large
          />
        </div>

        {/* Contribution word count */}
        <div className="card p-8 mb-8">
          <div className="bullet-heading mb-6">
            <h3 className="text-sm tracking-wider font-light text-text-secondary">
              日记字数贡献
            </h3>
          </div>
          <div className="space-y-5">
            {/* Author1 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] tracking-wider text-page-subtitle">
                  {AUTHORS.author1.emoji} {authorLabel("author1")}
                </span>
                <span className="text-[11px] tracking-wider font-medium text-page-supertitle">
                  {author1Chars.toLocaleString()} 字
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-stats-bar-track">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(author1Chars / totalChars) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                  className="h-full rounded-full bg-stats-bar-msg"
                />
              </div>
            </div>
            {/* Author2 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] tracking-wider text-page-subtitle">
                  {AUTHORS.author2.emoji} {authorLabel("author2")}
                </span>
                <span className="text-[11px] tracking-wider font-medium text-page-supertitle">
                  {author2Chars.toLocaleString()} 字
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-stats-bar-track">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(author2Chars / totalChars) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
                  className="h-full rounded-full bg-stats-bar-event"
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] mt-4 text-center tracking-wider text-page-footer-text">
            {totalChars <= 1 ? "还没有日记内容" : author1Chars > 0 && author2Chars > 0
              ? `共 ${totalChars.toLocaleString()} 字 — ${authorLabel(author1Chars > author2Chars ? "author1" : "author2")} 贡献 ${Math.round((Math.max(author1Chars, author2Chars) / totalChars) * 100)}%`
              : `共 ${totalChars.toLocaleString()} 字 — 全部由 ${authorLabel(author1Chars > 0 ? "author1" : "author2")} 书写`}
          </p>
        </div>

        {/* Monthly activity */}
        <div className="card p-8 mb-8">
          <div className="bullet-heading mb-8">
            <h3 className="text-sm tracking-wider font-light text-text-secondary">
              每月回忆数量
            </h3>
          </div>

          {/* Photos bar */}
          <p className="text-[11px] tracking-wider mb-3 text-page-footer-text">
            照片数量
          </p>
          <div className="space-y-2 mb-8">
            {monthlyActivity.map((month, i) => (
              <div key={month.month} className="flex items-center gap-3">
                <span className="text-[11px] w-10 text-right tracking-wider text-page-footer-text">
                  {month.month.slice(5)}月
                </span>
                <div className="flex-1 h-5 rounded-sm overflow-hidden bg-stats-bar-track">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(month.messages / maxMessages) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.04 }}
                    className="h-full rounded-sm bg-stats-bar-msg"
                  />
                </div>
                <span className="text-[11px] w-6 text-right text-page-footer-text">
                  {month.messages}
                </span>
              </div>
            ))}
          </div>

          {/* Diary bar */}
          <p className="text-[11px] tracking-wider mb-3 text-page-footer-text">
            日记数量
          </p>
          <div className="space-y-2">
            {monthlyActivity.map((month, i) => (
              <div key={`ev-${month.month}`} className="flex items-center gap-3">
                <span className="text-[11px] w-10 text-right tracking-wider text-page-footer-text">
                  {month.month.slice(5)}月
                </span>
                <div className="flex-1 h-5 rounded-sm overflow-hidden bg-stats-bar-track">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(month.events / maxEvents) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.04 }}
                    className="h-full rounded-sm bg-stats-bar-event"
                  />
                </div>
                <span className="text-[11px] w-6 text-right text-page-footer-text">
                  {month.events}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="card p-8 mb-8">
          <div className="bullet-heading mb-6">
            <h3 className="text-sm tracking-wider font-light text-text-secondary">
              最常出现的关键词
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {topKeywords.map((kw, i) => (
              <motion.span
                key={kw.word}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded border text-xs tracking-wider border-page-footer-border"
                style={{
                  opacity: 0.3 + (kw.count / maxKeyword) * 0.7,
                }}
              >
                {kw.word}
                <span className="text-[11px] opacity-40">{kw.count}</span>
              </motion.span>
            ))}
          </div>
        </div>

        {/* Event types */}
        <div className="card p-8 mb-8">
          <div className="bullet-heading mb-6">
            <h3 className="text-sm tracking-wider font-light text-text-secondary">
              事件类型分布
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(eventTypes).map(([type, count], i) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="text-center p-3 rounded border bg-stats-event-type-bg border-stats-event-type-border"
              >
                <p className="text-lg font-light text-text-secondary">{count}</p>
                <p className="text-[11px] mt-1 tracking-wider text-page-footer-text">
                  {eventLabels[type] || type}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mt-16 pt-10 border-t border-page-footer-border"
        >
          <p className="text-[11px] tracking-widest text-page-footer-text">
            · 数据会随着我们的故事一起成长 ·
          </p>
        </motion.div>
      </div>
    </div>
  );
}
