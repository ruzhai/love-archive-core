"use client";

import { useState, useEffect, useCallback } from "react";
import type { Song } from "@/lib/types";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
}

export function useSongLibrary() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/songs")
      .then(r => r.json())
      .then(d => { if (d.success) setSongs(d.songs); })
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, []);

  const addSong = useCallback(async (data: {
    title: string; artist?: string; dedication?: string; cover?: string; url?: string;
  }): Promise<Song | null> => {
    const res = await fetch("/api/songs", {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify(data),
    });
    const d = await res.json();
    if (d.success) {
      setSongs(prev => [...prev, d.song]);
      return d.song;
    }
    return null;
  }, []);

  const updateSong = useCallback(async (id: string, updates: Partial<Pick<Song, "title" | "artist" | "dedication" | "cover" | "url">>) => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    fetch(`/api/songs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify(updates),
    }).catch(() => {});
  }, []);

  const deleteSong = useCallback(async (id: string) => {
    setSongs(prev => prev.filter(s => s.id !== id));
    fetch(`/api/songs/${id}`, {
      method: "DELETE", headers: { "X-CSRF-Token": getCsrf() }, credentials: "include",
    }).catch(() => {});
  }, []);

  const reorderSongs = useCallback(async (orderedIds: string[]) => {
    setSongs(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, sortOrder: i }));
    });
    fetch("/api/songs/reorder", {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify({ orderedIds }),
    }).catch(() => {});
  }, []);

  const refreshSongs = useCallback(async () => {
    const res = await fetch("/api/songs");
    const d = await res.json();
    if (d.success) setSongs(d.songs);
  }, []);

  return { songs, initialized, addSong, updateSong, deleteSong, reorderSongs, refreshSongs };
}
