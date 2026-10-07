"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { LoveEntry, EventSortMode } from "@/lib/types";

const STORAGE_KEY = "love-archive-events";
const VERSION_KEY = "love-archive-events-version";
const CURRENT_VERSION = 4;

function migrateEvent(e: Record<string, unknown>): LoveEntry {
  const now = new Date().toISOString();
  let contentAuthor1 = "";
  let contentAuthor2 = "";
  if (typeof e.content_author1 === "string") {
    contentAuthor1 = e.content_author1;
    contentAuthor2 = typeof e.content_author2 === "string" ? e.content_author2 : "";
  } else if (typeof e.content === "string" && e.content) {
    if (e.author === "author2") { contentAuthor2 = e.content; } else { contentAuthor1 = e.content; }
  }
  const oldPhotos = Array.isArray(e.photos) ? e.photos as Array<{ id?: unknown }> : [];
  const existingIds = Array.isArray((e as any).photoIds) ? (e as any).photoIds as string[] : [];
  const photoIds = existingIds.length > 0 ? existingIds : oldPhotos.map((p: any) => String(p?.id || "")).filter(Boolean);
  return {
    id: String(e.id || ""), title: String(e.title || ""), summary: String(e.summary || ""),
    date: String(e.date || ""), content_author1: contentAuthor1, content_author2: contentAuthor2,
    photos: oldPhotos as LoveEntry["photos"], photoIds,
    mood: typeof e.mood === "string" ? e.mood : undefined,
    createdAt: String(e.createdAt || now), updatedAt: String(e.updatedAt || now),
  };
}

function loadFromLocalStorage(): LoveEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(migrateEvent);
    }
  } catch { /* ignore */ }
  return [];
}

function saveToLocalStorage(events: LoveEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
}

/** Convert server row format to client LoveEntry */
function rowToEntry(row: any): LoveEntry {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary || "",
    date: row.date,
    content_author1: row.contentAuthor1 || row.content_author1 || "",
    content_author2: row.contentAuthor2 || row.content_author2 || "",
    photoIds: JSON.parse(row.photoIds || row.photo_ids || "[]"),
    photos: [],
    mood: row.mood || undefined,
    firstAuthor: row.firstAuthor || row.first_author || undefined,
    createdAt: row.createdAt || row.created_at || "",
    updatedAt: row.updatedAt || row.updated_at || "",
  };
}

/** Convert client LoveEntry to server row format */
function entryToRow(entry: LoveEntry): any {
  return {
    id: entry.id,
    title: entry.title, summary: entry.summary, date: entry.date,
    content_author1: entry.content_author1, content_author2: entry.content_author2,
    photo_ids: JSON.stringify(entry.photoIds || []),
    mood: entry.mood || null,
    first_author: entry.firstAuthor || null,
    createdAt: entry.createdAt, updatedAt: entry.updatedAt,
  };
}

export function useEventLibrary() {
  const [events, setEvents] = useState<LoveEntry[]>([]);
  const [sortMode, setSortMode] = useState<EventSortMode>("date-desc");
  const [initialized, setInitialized] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(false);

  // Load: try server first, fallback to localStorage, fallback to defaults
  useEffect(() => {
    async function load() {
      // Try server
      try {
        const res = await fetch("/api/entries", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.entries)) {
            const server: LoveEntry[] = data.entries.map(rowToEntry);
            setServerAvailable(true);

            // Server is the source of truth — accept its list directly.
            // (Previously we merged localStorage-only entries back up, but
            // that resurrected entries the user had deleted server-side.)
            setEvents(server);
            saveToLocalStorage(server);
            setInitialized(true);
            return;
          }
        }
      } catch { /* server unavailable */ }

      // Fallback: localStorage
      serverFallbackLoad();
    }

    function serverFallbackLoad() {
      // 服务端不可用时退回本地缓存；两者都空就保持空列表，不编造内容。
      const local = loadFromLocalStorage();
      setEvents(local);
      setServerAvailable(false);
      setInitialized(true);
    }

    load();
    const stored = localStorage.getItem("love-archive-sort");
    if (stored) setSortMode(stored as EventSortMode);
  }, []);

  // Persist sort mode
  useEffect(() => {
    if (initialized && typeof window !== "undefined") {
      localStorage.setItem("love-archive-sort", sortMode);
    }
  }, [sortMode, initialized]);

  const sortedEvents = useMemo(() => {
    const sorted = [...events];
    switch (sortMode) {
      case "date-asc": return sorted.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
      case "date-desc": return sorted.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      case "updated-desc": return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      case "created-desc": return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case "title-asc": return sorted.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
      default: return sorted;
    }
  }, [events, sortMode]);

  const addEvent = useCallback(async (event: Omit<LoveEntry, "id" | "createdAt" | "updatedAt" | "photoIds"> & { photoIds?: string[] }) => {
    const now = new Date().toISOString();
    const newEvent: LoveEntry = {
      ...event,
      photoIds: (event as any).photoIds || [],
      content_author1: event.content_author1 || "",
      content_author2: event.content_author2 || "",
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now, updatedAt: now,
    };

    // Update local state first (optimistic)
    setEvents((prev) => {
      saveToLocalStorage([...prev, newEvent]);
      return [...prev, newEvent];
    });

    // Sync to server. On failure we THROW so the editor stays open and shows
    // "保存失败" instead of silently closing and losing the entry — the
    // optimistic localStorage copy is only a fallback, not the source of truth.
    const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    const res = await fetch("/api/entries", {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      credentials: "include", body: JSON.stringify(entryToRow(newEvent)),
    });
    if (!res.ok) {
      let msg = `保存失败 (HTTP ${res.status})`;
      try { const d = await res.json(); if (d && d.error) msg = d.error; } catch { /* keep default */ }
      throw new Error(msg);
    }

    return newEvent;
  }, []);

  const updateEvent = useCallback(async (id: string, updates: Partial<Omit<LoveEntry, "id" | "createdAt">>) => {
    setEvents((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e));
      saveToLocalStorage(updated);
      return updated;
    });

    const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    const body: any = { ...updates, updatedAt: new Date().toISOString() };
    if (body.photoIds && Array.isArray(body.photoIds)) body.photo_ids = JSON.stringify(body.photoIds);
    const res = await fetch(`/api/entries/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      credentials: "include", body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = `保存失败 (HTTP ${res.status})`;
      try { const d = await res.json(); if (d && d.error) msg = d.error; } catch { /* keep default */ }
      throw new Error(msg);
    }
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    setEvents((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveToLocalStorage(updated);
      return updated;
    });

    const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    const res = await fetch(`/api/entries/${id}`, {
      method: "DELETE", headers: { "X-CSRF-Token": token }, credentials: "include",
    });
    if (!res.ok) {
      let msg = `删除失败 (HTTP ${res.status})`;
      try { const d = await res.json(); if (d && d.error) msg = d.error; } catch { /* keep default */ }
      throw new Error(msg);
    }
  }, []);

  return { events: sortedEvents, sortMode, setSortMode, addEvent, updateEvent, deleteEvent, initialized, serverAvailable };
}
