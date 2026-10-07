import "server-only";

import { getDb, saveDb } from "@/lib/db";
import { photoComments } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export interface CommentRow {
  id: string;
  photoId: string;
  author: string;
  content: string;
  createdAt: string;
}

export async function listComments(photoId: string): Promise<CommentRow[]> {
  const db = await getDb();
  return db.select().from(photoComments)
    .where(eq(photoComments.photoId, photoId))
    .orderBy(asc(photoComments.createdAt))
    .all() as CommentRow[];
}

export async function createComment(
  comment: Omit<CommentRow, "createdAt"> & { createdAt?: string }
): Promise<CommentRow> {
  const db = await getDb();
  const row: CommentRow = {
    ...comment,
    createdAt: comment.createdAt || new Date().toISOString(),
  };
  db.insert(photoComments).values(row).run();
  saveDb();
  return row;
}

export async function deleteComment(id: string): Promise<boolean> {
  const db = await getDb();
  db.delete(photoComments).where(eq(photoComments.id, id)).run();
  saveDb();
  return true;
}
