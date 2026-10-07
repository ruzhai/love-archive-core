// ==================== 时间小工具（两端通用，非 server-only） ====================
// 用于「时间胶囊」等按日期解锁的逻辑，避免时区把「今天」算错一天。

/** 本地时区今天的 "YYYY-MM-DD" */
export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 是否已到解锁日（unlockAt 形如 "YYYY-MM-DD" 或完整 ISO） */
export function isUnlocked(unlockAt: string): boolean {
  if (!unlockAt) return true;
  return todayLocal() >= unlockAt.slice(0, 10);
}

/** 距解锁日还剩几天（已解锁返回 0，负数视为 0） */
export function daysUntil(unlockAt: string): number {
  if (isUnlocked(unlockAt)) return 0;
  const target = new Date(`${unlockAt.slice(0, 10)}T00:00:00`);
  const today = new Date(`${todayLocal()}T00:00:00`);
  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
