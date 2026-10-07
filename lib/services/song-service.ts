import "server-only";

import { getDb, saveDb } from "@/lib/db";
import { songs } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type { Song } from "@/lib/types";

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  dedication: string;
  cover: string;
  url: string | null;
  sortOrder: number;
  createdAt: string;
}

function toSong(row: SongRow): Song {
  return {
    ...row,
    artist: row.artist || "",
    dedication: row.dedication || "",
    cover: row.cover || "🎵",
    url: row.url || undefined,
  };
}

export async function listSongs(): Promise<Song[]> {
  const db = await getDb();
  const rows = db
    .select()
    .from(songs)
    .orderBy(asc(songs.sortOrder))
    .all() as SongRow[];
  return rows.map(toSong);
}

export async function getSong(id: string): Promise<Song | null> {
  const db = await getDb();
  const rows = db.select().from(songs).where(eq(songs.id, id)).all() as SongRow[];
  return rows[0] ? toSong(rows[0]) : null;
}

export async function createSong(data: {
  id: string;
  title: string;
  artist?: string;
  dedication?: string;
  cover?: string;
  url?: string;
}): Promise<Song> {
  const db = await getDb();
  const existing = db.select().from(songs).all() as SongRow[];
  const row: SongRow = {
    id: data.id,
    title: data.title,
    artist: data.artist || "",
    dedication: data.dedication || "",
    cover: data.cover || "🎵",
    url: data.url || null,
    sortOrder: existing.length,
    createdAt: new Date().toISOString(),
  };
  db.insert(songs).values(row).run();
  saveDb();
  return toSong(row);
}

export async function updateSong(
  id: string,
  updates: Partial<Pick<SongRow, "title" | "artist" | "dedication" | "cover" | "url">>
): Promise<Song | null> {
  const db = await getDb();
  const rows = db.select().from(songs).where(eq(songs.id, id)).all() as SongRow[];
  if (!rows[0]) return null;
  const merged: SongRow = { ...rows[0], ...updates };
  db.update(songs).set(merged).where(eq(songs.id, id)).run();
  saveDb();
  return toSong(merged);
}

export async function deleteSong(id: string): Promise<boolean> {
  const db = await getDb();
  db.delete(songs).where(eq(songs.id, id)).run();
  saveDb();
  return true;
}

export async function reorderSongs(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    const rows = db.select().from(songs).where(eq(songs.id, orderedIds[i])).all() as SongRow[];
    if (rows[0]) {
      db.update(songs)
        .set({ ...rows[0], sortOrder: i } as SongRow)
        .where(eq(songs.id, orderedIds[i]))
        .run();
    }
  }
  saveDb();
}
