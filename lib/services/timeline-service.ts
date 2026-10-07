import "server-only";
import { getDb, saveDb } from "@/lib/db";
import { timelineEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface TimelineRow {
  id: string; date: string; title: string; description: string;
  type: string; tags: string; image: string | null;
  chatRef: string | null; entryId: string | null; location: string | null;
  createdAt: string; updatedAt: string;
}

export async function listTimelineEvents(): Promise<TimelineRow[]> {
  const db = await getDb();
  return db.select().from(timelineEvents).all() as TimelineRow[];
}

export async function createTimelineEvent(data: Omit<TimelineRow, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }): Promise<TimelineRow> {
  const db = await getDb();
  const now = new Date().toISOString();
  // Defensive: never insert a NULL/empty primary key — a missing id would
  // create an un-editable, un-linkable ghost row.
  const id = data.id || `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const row: TimelineRow = { ...data, id, createdAt: data.createdAt || now, updatedAt: data.updatedAt || now };
  db.insert(timelineEvents).values(row).run();
  saveDb();
  return row;
}

export async function updateTimelineEvent(id: string, updates: Partial<Omit<TimelineRow, "id" | "createdAt">>): Promise<TimelineRow | null> {
  const db = await getDb();
  const rows = db.select().from(timelineEvents).where(eq(timelineEvents.id, id)).all();
  if (!rows[0]) return null;
  const merged = { ...rows[0], ...updates, updatedAt: new Date().toISOString() } as TimelineRow;
  db.update(timelineEvents).set(merged).where(eq(timelineEvents.id, id)).run();
  saveDb();
  return merged;
}

export async function deleteTimelineEvent(id: string): Promise<boolean> {
  const db = await getDb();
  db.delete(timelineEvents).where(eq(timelineEvents.id, id)).run();
  saveDb();
  return true;
}
