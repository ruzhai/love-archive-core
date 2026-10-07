import "server-only";

import { getDb, saveDb } from "@/lib/db";
import { videos } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export interface VideoRow {
  id: string; title: string; date: string; src: string;
  thumbnail: string | null; sortOrder: number; createdAt: string;
}

export async function listVideos(): Promise<VideoRow[]> {
  const db = await getDb();
  return db.select().from(videos).orderBy(asc(videos.sortOrder)).all() as VideoRow[];
}

export async function createVideo(data: Omit<VideoRow, "createdAt"> & { createdAt?: string }): Promise<VideoRow> {
  const db = await getDb();
  const row: VideoRow = {
    ...data, thumbnail: data.thumbnail || null, sortOrder: data.sortOrder ?? 0,
    createdAt: data.createdAt || new Date().toISOString(),
  };
  db.insert(videos).values(row).run();
  saveDb();
  return row;
}

export async function updateVideo(id: string, updates: Partial<Omit<VideoRow, "id" | "createdAt">>): Promise<VideoRow | null> {
  const db = await getDb();
  const rows = db.select().from(videos).where(eq(videos.id, id)).all();
  if (!rows[0]) return null;
  const merged = { ...rows[0], ...updates };
  db.update(videos).set(merged).where(eq(videos.id, id)).run();
  saveDb();
  return merged as VideoRow;
}

export async function deleteVideo(id: string): Promise<boolean> {
  const db = await getDb();
  db.delete(videos).where(eq(videos.id, id)).run();
  saveDb();
  return true;
}
