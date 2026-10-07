"use client";

import { useState, useEffect, useCallback } from "react";
import type { PhotoAlbum } from "@/lib/types";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
}

export function useAlbumLibrary() {
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/albums")
      .then(r => r.json())
      .then(d => { if (d.success) setAlbums(d.albums); })
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, []);

  const addAlbum = useCallback(async (title: string): Promise<PhotoAlbum | null> => {
    const res = await fetch("/api/albums", {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify({ title }),
    });
    const d = await res.json();
    if (d.success) {
      setAlbums(prev => [...prev, d.album]);
      return d.album;
    }
    return null;
  }, []);

  const updateAlbum = useCallback(async (id: string, updates: Partial<Pick<PhotoAlbum, "title" | "description" | "coverPhotoId" | "sortOrder">>) => {
    setAlbums(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    fetch(`/api/albums/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify(updates),
    }).catch(() => {});
  }, []);

  const refreshAlbums = useCallback(async () => {
    const res = await fetch("/api/albums");
    const d = await res.json();
    if (d.success) setAlbums(d.albums);
  }, []);

  const deleteAlbum = useCallback(async (id: string) => {
    setAlbums(prev => prev.filter(a => a.id !== id));
    fetch(`/api/albums/${id}`, {
      method: "DELETE", headers: { "X-CSRF-Token": getCsrf() }, credentials: "include",
    }).catch(() => {});
  }, []);

  const addPhotosToAlbum = useCallback(async (albumId: string, photoIds: string[]) => {
    await fetch(`/api/albums/${albumId}/photos`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify({ photoIds }),
    });
  }, []);

  const removePhotosFromAlbum = useCallback(async (albumId: string, photoIds: string[]) => {
    await fetch(`/api/albums/${albumId}/photos`, {
      method: "DELETE", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify({ photoIds }),
    });
  }, []);

  const reorderPhotos = useCallback(async (albumId: string, orderedIds: string[]) => {
    fetch(`/api/albums/${albumId}/photos/reorder`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify({ orderedIds }),
    }).catch(() => {});
  }, []);

  const reorderAlbums = useCallback(async (orderedIds: string[]) => {
    fetch("/api/albums/reorder", {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify({ orderedIds }),
    }).catch(() => {});
  }, []);

  return { albums, initialized, addAlbum, updateAlbum, deleteAlbum, refreshAlbums, addPhotosToAlbum, removePhotosFromAlbum, reorderPhotos, reorderAlbums };
}
