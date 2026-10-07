import "server-only";

import { DATES } from "@/lib/config";
import { listAnniversaries } from "@/lib/services/anniversary-service";

// ==================== 「纪念日倒数」聚合 ====================
// 两个「神圣」纪念日（相识日 / 在一起）来自 config 的 DATES，永不漂移；
// 其余（生日 / 自定义）来自 anniversaries 表。每个纪念日按 MM-DD 每年复现，
// 计算下一个日期 + 剩余天数 + 已走过周年数。

export interface UpcomingAnniversary {
  id: string;
  title: string;
  emoji: string;
  description: string;
  type: string;
  monthDay: string; // MM-DD
  nextDate: string; // YYYY-MM-DD（下一次）
  daysLeft: number;
  yearsPassed: number; // 已走过周年数（若起始年份已知）
  isBuiltin: boolean;
  isToday: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function nextOccurrence(monthDay: string, today: Date): Date {
  const [m, d] = monthDay.split("-").map(Number);
  const y = today.getFullYear();
  let cand = new Date(y, m - 1, d);
  if (cand.getTime() < today.getTime()) {
    cand = new Date(y + 1, m - 1, d);
  }
  return cand;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function toMonthDay(date: string): string {
  return date.slice(5, 10);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function getUpcomingAnniversaries(): Promise<UpcomingAnniversary[]> {
  const today = startOfToday();

  const builtins = [
    {
      id: "builtin-start",
      title: "我们相识的日子",
      emoji: "✨",
      description: "故事开始的那一天",
      type: "first_meeting",
      date: toMonthDay(DATES.startDate),
      year: DATES.startDate.slice(0, 4),
    },
    {
      id: "builtin-relationship",
      title: "在一起的日子",
      emoji: "❤️",
      description: "正式在一起的那一天",
      type: "relationship",
      date: toMonthDay(DATES.relationshipDate),
      year: DATES.relationshipDate.slice(0, 4),
    },
  ];

  const custom = await listAnniversaries();

  const result: UpcomingAnniversary[] = [];

  for (const b of builtins) {
    const next = nextOccurrence(b.date, today);
    const daysLeft = daysBetween(today, next);
    result.push({
      id: b.id,
      title: b.title,
      emoji: b.emoji,
      description: b.description,
      type: b.type,
      monthDay: b.date,
      nextDate: toDateStr(next),
      daysLeft,
      yearsPassed: next.getFullYear() - Number(b.year),
      isBuiltin: true,
      isToday: daysLeft === 0,
    });
  }

  for (const c of custom) {
    const next = nextOccurrence(c.date, today);
    const daysLeft = daysBetween(today, next);
    const startYear = c.year ? Number(c.year) : null;
    result.push({
      id: c.id,
      title: c.title,
      emoji: c.emoji || "📅",
      description: c.description || "",
      type: c.type,
      monthDay: c.date,
      nextDate: toDateStr(next),
      daysLeft,
      yearsPassed: startYear ? next.getFullYear() - startYear : 0,
      isBuiltin: false,
      isToday: daysLeft === 0,
    });
  }

  result.sort((a, b) => a.daysLeft - b.daysLeft);
  return result;
}
