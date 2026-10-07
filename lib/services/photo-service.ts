import "server-only";

import { getDb, saveDb } from "@/lib/db";
import { standalonePhotos } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export interface PhotoRow {
  id: string;
  caption: string;
  date: string;
  src: string;
  width: number;
  height: number;
  sortOrder: number;
  rotation: number;
  entryId: string | null;
  createdAt: string;
}

export async function listPhotos(): Promise<PhotoRow[]> {
  const db = await getDb();
  return db.select().from(standalonePhotos).orderBy(asc(standalonePhotos.sortOrder)).all() as PhotoRow[];
}

export async function getPhoto(id: string): Promise<PhotoRow | null> {
  const db = await getDb();
  const rows = db.select().from(standalonePhotos).where(eq(standalonePhotos.id, id)).all();
  return (rows[0] as PhotoRow) || null;
}

export async function createPhoto(photo: Omit<PhotoRow, "createdAt"> & { createdAt?: string }): Promise<PhotoRow> {
  const db = await getDb();
  const row: PhotoRow = {
    ...photo,
    entryId: photo.entryId || null,
    createdAt: photo.createdAt || new Date().toISOString(),
  };
  db.insert(standalonePhotos).values(row).run();
  saveDb();
  return row;
}

export async function updatePhoto(id: string, updates: Partial<Omit<PhotoRow, "id" | "createdAt">>): Promise<PhotoRow | null> {
  const db = await getDb();
  const existing = db.select().from(standalonePhotos).where(eq(standalonePhotos.id, id)).all();
  if (!existing[0]) return null;
  const merged = { ...existing[0], ...updates } as PhotoRow;
  db.update(standalonePhotos).set(merged).where(eq(standalonePhotos.id, id)).run();
  saveDb();
  return merged;
}

export async function deletePhoto(id: string): Promise<boolean> {
  const db = await getDb();
  db.delete(standalonePhotos).where(eq(standalonePhotos.id, id)).run();
  saveDb();
  return true;
}
