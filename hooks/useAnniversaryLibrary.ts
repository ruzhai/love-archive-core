"use client";

import { useState, useEffect, useCallback } from "react";
import type { Anniversary } from "@/lib/types";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
}

export function useAnniversaryLibrary() {
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/anniversaries")
      .then(r => r.json())
      .then(d => { if (d.success) setAnniversaries(d.anniversaries); })
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, []);

  const addAnniversary = useCallback(async (data: {
    title: string; date: string; year?: string; type?: string; description?: string; emoji?: string;
  }): Promise<Anniversary | null> => {
    const res = await fetch("/api/anniversaries", {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify(data),
    });
    const d = await res.json();
    if (d.success) {
      setAnniversaries(prev => [...prev, d.anniversary]);
      return d.anniversary;
    }
    return null;
  }, []);

  const updateAnniversary = useCallback(async (id: string, updates: Partial<Pick<Anniversary, "title" | "date" | "year" | "type" | "description" | "emoji">>) => {
    setAnniversaries(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    fetch(`/api/anniversaries/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify(updates),
    }).catch(() => {});
  }, []);

  const deleteAnniversary = useCallback(async (id: string) => {
    setAnniversaries(prev => prev.filter(a => a.id !== id));
    fetch(`/api/anniversaries/${id}`, {
      method: "DELETE", headers: { "X-CSRF-Token": getCsrf() }, credentials: "include",
    }).catch(() => {});
  }, []);

  const reorderAnniversaries = useCallback(async (orderedIds: string[]) => {
    setAnniversaries(prev => {
      const map = new Map(prev.map(a => [a.id, a]));
      const next = orderedIds.map((id, i) => ({ ...map.get(id)!, sortOrder: i }));
      return next;
    });
    fetch("/api/anniversaries/reorder", {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify({ orderedIds }),
    }).catch(() => {});
  }, []);

  const refreshAnniversaries = useCallback(async () => {
    const res = await fetch("/api/anniversaries");
    const d = await res.json();
    if (d.success) setAnniversaries(d.anniversaries);
  }, []);

  return { anniversaries, initialized, addAnniversary, updateAnniversary, deleteAnniversary, reorderAnniversaries, refreshAnniversaries };
}
