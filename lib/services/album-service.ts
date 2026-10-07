import "server-only";

import { getDb, saveDb } from "@/lib/db";
import { photoAlbums, photoAlbumItems, standalonePhotos } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export interface AlbumRow {
  id: string;
  title: string;
  description: string | null;
  coverPhotoId: string | null;
  sortOrder: number;
  createdAt: string;
  photoCount?: number;
  coverSrc?: string;
}

export interface AlbumItemRow {
  albumId: string;
  photoId: string;
  sortOrder: number;
  addedAt: string;
}

// ---- Albums ----

export async function listAlbums(): Promise<AlbumRow[]> {
  const db = await getDb();
  const albums = db.select().from(photoAlbums).orderBy(asc(photoAlbums.sortOrder)).all() as AlbumRow[];
  // Enrich with photo count + cover src
  for (const album of albums) {
    const items = db.select().from(photoAlbumItems)
      .where(eq(photoAlbumItems.albumId, album.id))
      .orderBy(asc(photoAlbumItems.sortOrder))
      .all() as AlbumItemRow[];
    album.photoCount = items.length;
    if (items.length > 0) {
      const coverPhotoId = album.coverPhotoId || items[0].photoId;
      const photoRows = db.select().from(standalonePhotos)
        .where(eq(standalonePhotos.id, coverPhotoId)).all() as any[];
      album.coverSrc = photoRows[0]?.src || undefined;
    }
  }
  return albums;
}

export async function getAlbum(id: string): Promise<AlbumRow | null> {
  const db = await getDb();
  const rows = db.select().from(photoAlbums).where(eq(photoAlbums.id, id)).all();
  return (rows[0] as AlbumRow) || null;
}

export async function createAlbum(data: { id: string; title: string; description?: string }): Promise<AlbumRow> {
  const db = await getDb();
  const row = {
    id: data.id,
    title: data.title,
    description: data.description || "",
    coverPhotoId: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  } as const;
  db.insert(photoAlbums).values(row).run();
  saveDb();
  return row;
}

export async function updateAlbum(id: string, updates: Partial<Pick<AlbumRow, "title" | "description" | "coverPhotoId" | "sortOrder">>): Promise<AlbumRow | null> {
  const db = await getDb();
  const rows = db.select().from(photoAlbums).where(eq(photoAlbums.id, id)).all();
  if (!rows[0]) return null;
  const merged = { ...rows[0], ...updates, description: updates.description ?? rows[0].description ?? "" };
  db.update(photoAlbums).set(merged as any).where(eq(photoAlbums.id, id)).run();
  saveDb();
  return merged as AlbumRow;
}

export async function deleteAlbum(id: string): Promise<boolean> {
  const db = await getDb();
  db.delete(photoAlbumItems).where(eq(photoAlbumItems.albumId, id)).run();
  db.delete(photoAlbums).where(eq(photoAlbums.id, id)).run();
  saveDb();
  return true;
}

// ---- Album items (photos in album) ----

export async function listAlbumPhotos(albumId: string): Promise<AlbumItemRow[]> {
  const db = await getDb();
  return db.select().from(photoAlbumItems)
    .where(eq(photoAlbumItems.albumId, albumId))
    .orderBy(asc(photoAlbumItems.sortOrder))
    .all() as AlbumItemRow[];
}

export async function addPhotosToAlbum(albumId: string, photoIds: string[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  // Get current max sortOrder for this album
  const existing = db.select().from(photoAlbumItems)
    .where(eq(photoAlbumItems.albumId, albumId))
    .orderBy(asc(photoAlbumItems.sortOrder))
    .all() as AlbumItemRow[];
  const maxSort = existing.length > 0 ? Math.max(...existing.map(e => e.sortOrder)) : -1;

  for (let i = 0; i < photoIds.length; i++) {
    // Skip duplicates
    if (existing.some(e => e.photoId === photoIds[i])) continue;
    db.insert(photoAlbumItems).values({
      albumId,
      photoId: photoIds[i],
      sortOrder: maxSort + 1 + i,
      addedAt: now,
    }).run();
  }
  saveDb();
}

export async function removePhotosFromAlbum(albumId: string, photoIds: string[]): Promise<void> {
  const db = await getDb();
  const sqlDb = (db as any).$client;
  for (const pid of photoIds) {
    sqlDb.run("DELETE FROM photo_album_items WHERE album_id = ? AND photo_id = ?", [albumId, pid]);
  }
  saveDb();
}

export async function reorderAlbumPhotos(albumId: string, orderedIds: string[]): Promise<void> {
  const db = await getDb();
  const sqlDb = (db as any).$client;
  for (let i = 0; i < orderedIds.length; i++) {
    sqlDb.run("UPDATE photo_album_items SET sort_order = ? WHERE album_id = ? AND photo_id = ?", [i, albumId, orderedIds[i]]);
  }
  saveDb();
}

// Reorder albums themselves
export async function reorderAlbums(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    const rows = db.select().from(photoAlbums).where(eq(photoAlbums.id, orderedIds[i])).all() as AlbumRow[];
    if (rows[0]) {
      db.update(photoAlbums).set({ ...rows[0], sortOrder: i } as any).where(eq(photoAlbums.id, orderedIds[i])).run();
    }
  }
  saveDb();
}

// Get album IDs that a photo belongs to
export async function getPhotoAlbums(photoId: string): Promise<string[]> {
  const db = await getDb();
  const rows = db.select().from(photoAlbumItems).all() as AlbumItemRow[];
  return rows.filter(r => r.photoId === photoId).map(r => r.albumId);
}
