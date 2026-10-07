"use client";

import { useState, useEffect, useCallback } from "react";

export interface TimelineEvent {
  id: string; date: string; title: string; description: string;
  type: string; tags: string[]; image?: string; chatRef?: string; entryId?: string; location?: string;
  createdAt: string; updatedAt: string;
}

function rowToEvent(row: any): TimelineEvent {
  return {
    id: row.id, date: row.date, title: row.title, description: row.description || "",
    type: row.type, tags: typeof row.tags === "string" ? JSON.parse(row.tags) : (row.tags || []),
    image: row.image || undefined, chatRef: row.chatRef || row.chat_ref || undefined,
    entryId: row.entryId || row.entry_id || undefined,
    location: row.location || undefined, createdAt: row.createdAt || row.created_at || "",
    updatedAt: row.updatedAt || row.updated_at || "",
  };
}

export function useTimelineLibrary() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/timeline").then(r => r.json()).then(data => {
      if (data.success) setEvents(data.events.map(rowToEvent));
    }).catch(() => {}).finally(() => setInitialized(true));
  }, []);

  const addEvent = useCallback(async (event: Omit<TimelineEvent, "id" | "createdAt" | "updatedAt">) => {
    const newEvent: TimelineEvent = {
      ...event, tags: event.tags || [],
      id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setEvents(prev => [...prev, newEvent]);
    try {
      const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
      await fetch("/api/timeline", {
        method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        credentials: "include", body: JSON.stringify(newEvent),
      });
    } catch { /* will sync next load */ }
    return newEvent;
  }, []);

  const updateEvent = useCallback(async (id: string, updates: Partial<TimelineEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e));
    try {
      const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
      await fetch(`/api/timeline/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        credentials: "include", body: JSON.stringify(updates),
      });
    } catch { /* will sync next load */ }
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try {
      const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
      await fetch(`/api/timeline/${id}`, { method: "DELETE", headers: { "X-CSRF-Token": token }, credentials: "include" });
    } catch { /* will sync next load */ }
  }, []);

  return { events, initialized, addEvent, updateEvent, deleteEvent };
}
