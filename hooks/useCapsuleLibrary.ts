"use client";

import { useState, useEffect, useCallback } from "react";
import type { Capsule } from "@/lib/types";

/** 服务端在访客态会把未拆信的内容清空并标记 locked */
export type CapsuleWithLock = Capsule & { locked?: boolean };

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
}

export function useCapsuleLibrary() {
  const [capsules, setCapsules] = useState<CapsuleWithLock[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/capsules")
      .then(r => r.json())
      .then(d => { if (d.success) setCapsules(d.capsules); })
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, []);

  const addCapsule = useCallback(async (data: {
    title: string; content?: string; author: string; mood?: string; unlockAt: string;
  }): Promise<Capsule | null> => {
    const res = await fetch("/api/capsules", {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify(data),
    });
    const d = await res.json();
    if (d.success) {
      setCapsules(prev => [...prev, { ...d.capsule, locked: false }]);
      return d.capsule;
    }
    return null;
  }, []);

  const updateCapsule = useCallback(async (id: string, updates: Partial<Pick<Capsule, "title" | "content" | "author" | "mood" | "unlockAt">>) => {
    setCapsules(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    fetch(`/api/capsules/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrf() },
      credentials: "include", body: JSON.stringify(updates),
    }).catch(() => {});
  }, []);

  const deleteCapsule = useCallback(async (id: string) => {
    setCapsules(prev => prev.filter(c => c.id !== id));
    fetch(`/api/capsules/${id}`, {
      method: "DELETE", headers: { "X-CSRF-Token": getCsrf() }, credentials: "include",
    }).catch(() => {});
  }, []);

  const refreshCapsules = useCallback(async () => {
    const res = await fetch("/api/capsules");
    const d = await res.json();
    if (d.success) setCapsules(d.capsules);
  }, []);

  return { capsules, initialized, addCapsule, updateCapsule, deleteCapsule, refreshCapsules };
}
