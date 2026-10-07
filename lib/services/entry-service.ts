import "server-only";

import { getDb, saveDb } from "@/lib/db";
import { loveEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface LoveEntryRow {
  id: string;
  title: string;
  summary: string;
  date: string;
  contentAuthor1: string;
  contentAuthor2: string;
  photoIds: string;
  mood: string | null;
  firstAuthor: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listEntries(): Promise<LoveEntryRow[]> {
  const db = await getDb();
  return db.select().from(loveEntries).all() as LoveEntryRow[];
}

export async function getEntry(id: string): Promise<LoveEntryRow | null> {
  const db = await getDb();
  const rows = db.select().from(loveEntries).where(eq(loveEntries.id, id)).all();
  return (rows[0] as LoveEntryRow) || null;
}

export async function createEntry(entry: Record<string, any>): Promise<LoveEntryRow> {
  const db = await getDb();
  const now = new Date().toISOString();
  const n = normalizeEntryInput(entry);
  const row: LoveEntryRow = {
    id: String(n.id ?? entry.id ?? ""),
    title: String(n.title ?? ""),
    summary: String(n.summary ?? ""),
    date: String(n.date ?? ""),
    contentAuthor1: String(n.contentAuthor1 ?? ""),
    contentAuthor2: String(n.contentAuthor2 ?? ""),
    photoIds: String(n.photoIds ?? "[]"),
    mood: n.mood ?? null,
    firstAuthor: (n.firstAuthor ?? (entry as any).first_author) || null,
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
  };
  db.insert(loveEntries).values(row).run();
  saveDb();
  return row;
}

export async function updateEntry(id: string, updates: Record<string, any>): Promise<LoveEntryRow | null> {
  const db = await getDb();
  const existing = rowsToEntries(db.select().from(loveEntries).where(eq(loveEntries.id, id)).all());
  if (!existing[0]) return null;
  const merged = { ...existing[0], ...normalizeEntryInput(updates), updatedAt: new Date().toISOString() };
  db.update(loveEntries).set(merged).where(eq(loveEntries.id, id)).run();
  saveDb();
  return merged;
}

/**
 * Accept both camelCase (DB/Drizzle) and snake_case (client entryToRow) keys
 * and return a partial row using only the camelCase keys Drizzle understands.
 * Without this, content_author1 / content_author2 / photo_ids sent by the client
 * are silently ignored on insert/update and the diary body is lost.
 */
function normalizeEntryInput(input: Record<string, any>): Partial<LoveEntryRow> {
  const out: Partial<LoveEntryRow> = {};
  if (input.id !== undefined) out.id = input.id;
  if (input.title !== undefined) out.title = input.title;
  if (input.summary !== undefined) out.summary = input.summary;
  if (input.date !== undefined) out.date = input.date;

  const cr = input.contentAuthor1 ?? input.content_author1;
  if (cr !== undefined) out.contentAuthor1 = cr;
  const cf = input.contentAuthor2 ?? input.content_author2;
  if (cf !== undefined) out.contentAuthor2 = cf;

  const pi = input.photoIds ?? input.photo_ids;
  if (pi !== undefined) out.photoIds = typeof pi === "string" ? pi : JSON.stringify(pi);

  if (input.mood !== undefined) out.mood = input.mood || null;
  const fa = input.firstAuthor ?? input.first_author;
  if (fa !== undefined) out.firstAuthor = fa || null;
  return out;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const db = await getDb();
  db.delete(loveEntries).where(eq(loveEntries.id, id)).run();
  saveDb();
  return true;
}

function rowsToEntries(rows: Record<string, unknown>[]): LoveEntryRow[] {
  return rows.map(r => ({
    id: String(r.id || ""),
    title: String(r.title || ""),
    summary: String(r.summary || ""),
    date: String(r.date || ""),
    contentAuthor1: String((r as any).content_author1 || r.contentAuthor1 || ""),
    contentAuthor2: String((r as any).content_author2 || r.contentAuthor2 || ""),
    photoIds: String((r as any).photo_ids || r.photoIds || "[]"),
    mood: r.mood ? String(r.mood) : null,
    firstAuthor: (r as any).first_author || r.firstAuthor || null,
    createdAt: String(r.createdAt || ""),
    updatedAt: String(r.updatedAt || ""),
  }));
}
