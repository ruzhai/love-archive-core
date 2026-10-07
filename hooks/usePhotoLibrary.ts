"use client";

import { useState, useEffect, useCallback } from "react";
import type { StandalonePhoto } from "@/lib/types";

const STORAGE_KEY = "love-archive-photos";

function loadLocal(): StandalonePhoto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(photos: StandalonePhoto[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(photos)); } catch { /* quota */ }
}

function rowToPhoto(row: any): StandalonePhoto {
  return {
    id: row.id, caption: row.caption || "", date: row.date || "",
    src: row.src, width: row.width || 800, height: row.height || 600,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
    rotation: row.rotation ?? 0,
    entryId: row.entryId || row.entry_id || null,
    createdAt: row.createdAt || row.created_at || "",
  };
}

function photoToRow(photo: StandalonePhoto): any {
  return {
    id: photo.id, caption: photo.caption, date: photo.date,
    src: photo.src, width: photo.width, height: photo.height,
    sort_order: photo.sortOrder ?? 0,
    rotation: photo.rotation ?? 0,
    entry_id: photo.entryId || null,
    createdAt: photo.createdAt,
  };
}

export function usePhotoLibrary() {
  const [photos, setPhotos] = useState<StandalonePhoto[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/photos", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.photos)) {
            const server: StandalonePhoto[] = data.photos.map(rowToPhoto);
            setServerAvailable(true);

            // Server is the source of truth.
            setPhotos(server);
            saveLocal(server);
            setInitialized(true);
            return;
          }
        }
      } catch { /* server unavailable */ }

      const local = loadLocal();
      setPhotos(local);
      setInitialized(true);
    }
    load();
  }, []);

  const addPhoto = useCallback(async (photo: Omit<StandalonePhoto, "id" | "createdAt">): Promise<StandalonePhoto> => {
    const newPhoto: StandalonePhoto = {
      ...photo, entryId: photo.entryId || null, sortOrder: photo.sortOrder ?? 0,
      id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setPhotos(prev => { const n = [...prev, newPhoto]; saveLocal(n); return n; });

    if (serverAvailable) {
      try {
        const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
        await fetch("/api/photos", {
          method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
          credentials: "include", body: JSON.stringify(photoToRow(newPhoto)),
        });
      } catch { /* will sync next load */ }
    }
    return newPhoto;
  }, [serverAvailable]);

  // Async + failure-aware: returns true only if the server accepted the PATCH.
  // Callers that care (bulk link) can branch on it; fire-and-forget callers
  // remain safe because we never reject — we resolve false on any failure.
  const updatePhoto = useCallback(async (id: string, updates: Partial<Omit<StandalonePhoto, "id" | "createdAt">>): Promise<boolean> => {
    setPhotos(prev => { const n = prev.map(p => p.id === id ? { ...p, ...updates } : p); saveLocal(n); return n; });

    const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    const body: any = { ...updates };
    if (updates.entryId !== undefined) body.entry_id = updates.entryId;
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        credentials: "include", body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const deletePhoto = useCallback(async (id: string): Promise<boolean> => {
    setPhotos(prev => { const n = prev.filter(p => p.id !== id); saveLocal(n); return n; });

    const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: "DELETE", headers: { "X-CSRF-Token": token }, credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const getPhotosByEntry = useCallback((entryId: string) => photos.filter(p => p.entryId === entryId), [photos]);
  const getStandalonePhotos = useCallback(() => photos.filter(p => !p.entryId), [photos]);
  const linkPhotoToEntry = useCallback((photoId: string, entryId: string | null) => updatePhoto(photoId, { entryId }), [updatePhoto]);

  // Bulk-link many photos to one entry in a single request (one saveDb).
  // Resolves true/false; never rejects, so fire-and-forget callers stay safe.
  const linkPhotosToEntry = useCallback(async (photoIds: string[], entryId: string): Promise<boolean> => {
    if (!Array.isArray(photoIds) || photoIds.length === 0) return true;

    // Optimistic local update so the gallery reflects the link immediately.
    setPhotos(prev => {
      const n = prev.map(p => photoIds.includes(p.id) ? { ...p, entryId } : p);
      saveLocal(n);
      return n;
    });

    const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    try {
      const res = await fetch("/api/photos/link", {
        method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        credentials: "include", body: JSON.stringify({ entryId, photoIds }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return { photos, initialized, addPhoto, updatePhoto, deletePhoto, getPhotosByEntry, getStandalonePhotos, linkPhotoToEntry, linkPhotosToEntry };
}
