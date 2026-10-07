import "server-only";

import { getDb, saveDb } from "@/lib/db";
import { capsules } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type { Capsule } from "@/lib/types";

export interface CapsuleRow {
  id: string;
  title: string;
  content: string;
  author: string;
  mood: string | null;
  unlockAt: string;
  createdAt: string;
  updatedAt: string;
}

function toCapsule(row: CapsuleRow): Capsule {
  return {
    ...row,
    author: (row.author as Capsule["author"]) || "author1",
    mood: row.mood || undefined,
  };
}

export async function listCapsules(): Promise<Capsule[]> {
  const db = await getDb();
  const rows = db
    .select()
    .from(capsules)
    .orderBy(asc(capsules.unlockAt))
    .all() as CapsuleRow[];
  return rows.map(toCapsule);
}

export async function getCapsule(id: string): Promise<Capsule | null> {
  const db = await getDb();
  const rows = db.select().from(capsules).where(eq(capsules.id, id)).all() as CapsuleRow[];
  return rows[0] ? toCapsule(rows[0]) : null;
}

export async function createCapsule(data: {
  id: string;
  title: string;
  content?: string;
  author: string;
  mood?: string;
  unlockAt: string;
}): Promise<Capsule> {
  const db = await getDb();
  const now = new Date().toISOString();
  const row: CapsuleRow = {
    id: data.id,
    title: data.title,
    content: data.content || "",
    author: data.author,
    mood: data.mood || null,
    unlockAt: data.unlockAt,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(capsules).values(row).run();
  saveDb();
  return toCapsule(row);
}

export async function updateCapsule(
  id: string,
  updates: Partial<Pick<CapsuleRow, "title" | "content" | "author" | "mood" | "unlockAt">>
): Promise<Capsule | null> {
  const db = await getDb();
  const rows = db.select().from(capsules).where(eq(capsules.id, id)).all() as CapsuleRow[];
  if (!rows[0]) return null;
  const merged: CapsuleRow = {
    ...rows[0],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  db.update(capsules).set(merged).where(eq(capsules.id, id)).run();
  saveDb();
  return toCapsule(merged);
}

export async function deleteCapsule(id: string): Promise<boolean> {
  const db = await getDb();
  db.delete(capsules).where(eq(capsules.id, id)).run();
  saveDb();
  return true;
}
