import "server-only";

import { getDb, saveDb } from "@/lib/db";
import { anniversaries } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type { Anniversary } from "@/lib/types";

export interface AnniversaryRow {
  id: string;
  title: string;
  date: string;
  year: string | null;
  type: string;
  description: string;
  emoji: string;
  sortOrder: number;
  createdAt: string;
}

function toAnniversary(row: AnniversaryRow): Anniversary {
  return {
    ...row,
    type: (row.type as Anniversary["type"]) || "custom",
    description: row.description || "",
    emoji: row.emoji || "📅",
  };
}

export async function listAnniversaries(): Promise<Anniversary[]> {
  const db = await getDb();
  const rows = db
    .select()
    .from(anniversaries)
    .orderBy(asc(anniversaries.sortOrder))
    .all() as AnniversaryRow[];
  return rows.map(toAnniversary);
}

export async function getAnniversary(id: string): Promise<Anniversary | null> {
  const db = await getDb();
  const rows = db.select().from(anniversaries).where(eq(anniversaries.id, id)).all() as AnniversaryRow[];
  return rows[0] ? toAnniversary(rows[0]) : null;
}

export async function createAnniversary(data: {
  id: string;
  title: string;
  date: string;
  year?: string;
  type?: string;
  description?: string;
  emoji?: string;
}): Promise<Anniversary> {
  const db = await getDb();
  const existing = db.select().from(anniversaries).all() as AnniversaryRow[];
  const row: AnniversaryRow = {
    id: data.id,
    title: data.title,
    date: data.date,
    year: data.year || null,
    type: data.type || "custom",
    description: data.description || "",
    emoji: data.emoji || "📅",
    sortOrder: existing.length,
    createdAt: new Date().toISOString(),
  };
  db.insert(anniversaries).values(row).run();
  saveDb();
  return toAnniversary(row);
}

export async function updateAnniversary(
  id: string,
  updates: Partial<Pick<AnniversaryRow, "title" | "date" | "year" | "type" | "description" | "emoji">>
): Promise<Anniversary | null> {
  const db = await getDb();
  const rows = db.select().from(anniversaries).where(eq(anniversaries.id, id)).all() as AnniversaryRow[];
  if (!rows[0]) return null;
  const merged = { ...rows[0], ...updates };
  db.update(anniversaries)
    .set(merged as AnniversaryRow)
    .where(eq(anniversaries.id, id))
    .run();
  saveDb();
  return toAnniversary(merged);
}

export async function deleteAnniversary(id: string): Promise<boolean> {
  const db = await getDb();
  db.delete(anniversaries).where(eq(anniversaries.id, id)).run();
  saveDb();
  return true;
}

export async function reorderAnniversaries(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    const rows = db.select().from(anniversaries).where(eq(anniversaries.id, orderedIds[i])).all() as AnniversaryRow[];
    if (rows[0]) {
      db.update(anniversaries)
        .set({ ...rows[0], sortOrder: i } as AnniversaryRow)
        .where(eq(anniversaries.id, orderedIds[i]))
        .run();
    }
  }
  saveDb();
}
