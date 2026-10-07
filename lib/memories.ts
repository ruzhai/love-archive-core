import "server-only";

import { listPhotos } from "@/lib/services/photo-service";
import { listEntries } from "@/lib/services/entry-service";
import { listTimelineEvents } from "@/lib/services/timeline-service";
import type { OnThisDay, OnThisDayMemory } from "@/lib/types";

// ==================== 「那年今日」聚合 ====================
// 聚合「同月同日」的内容（照片 / 日记 / 时间线事件）。
// 诚实原则：不硬造过去——只返回库里真实存在的同月同日记录；
// 现有数据若只有今年，那「那年今日」展示的就是「这一天的你们」。

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function matchesMonthDay(date: string, monthDay: string): boolean {
  return !!date && date.slice(5, 10) === monthDay;
}

export async function getMemoriesForDate(month: number, day: number): Promise<OnThisDay> {
  const monthDay = `${pad(month)}-${pad(day)}`;

  const [photos, entries, events] = await Promise.all([
    listPhotos(),
    listEntries(),
    listTimelineEvents(),
  ]);

  const memories: OnThisDayMemory[] = [];

  for (const p of photos) {
    if (matchesMonthDay(p.date, monthDay)) {
      memories.push({
        kind: "photo",
        date: p.date,
        year: p.date.slice(0, 4),
        title: p.caption || "一张照片",
        src: p.src,
        href: "/gallery",
      });
    }
  }

  for (const e of entries) {
    if (matchesMonthDay(e.date, monthDay)) {
      memories.push({
        kind: "entry",
        date: e.date,
        year: e.date.slice(0, 4),
        title: e.title || "一篇日记",
        subtitle: e.summary || undefined,
        href: "/diary",
      });
    }
  }

  for (const ev of events) {
    if (matchesMonthDay(ev.date, monthDay)) {
      memories.push({
        kind: "event",
        date: ev.date,
        year: ev.date.slice(0, 4),
        title: ev.title,
        subtitle: ev.description || undefined,
        href: "/timeline",
      });
    }
  }

  // 最新在前
  memories.sort((a, b) => b.date.localeCompare(a.date));

  return {
    monthDay,
    memories,
    total: memories.length,
    hasContent: memories.length > 0,
  };
}

export async function getMemoriesForToday(): Promise<OnThisDay> {
  const now = new Date();
  return getMemoriesForDate(now.getMonth() + 1, now.getDate());
}
