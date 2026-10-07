"use client";

import { useState, useEffect, useCallback } from "react";

export interface VideoItem {
  id: string; title: string; date: string; src: string;
  thumbnail?: string; sortOrder?: number;
}

function rowToVideo(row: any): VideoItem {
  return {
    id: row.id, title: row.title, date: row.date, src: row.src,
    thumbnail: row.thumbnail || undefined,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
  };
}

export function useVideoLibrary() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/videos").then(r => r.json()).then(d => {
      if (d.success) setVideos(d.videos.map(rowToVideo));
    }).catch(() => {}).finally(() => setInitialized(true));
  }, []);

  const addVideo = useCallback(async (video: Omit<VideoItem, "sortOrder">) => {
    const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    const res = await fetch("/api/videos", {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      credentials: "include", body: JSON.stringify(video),
    });
    const d = await res.json();
    if (d.success) {
      setVideos(prev => [...prev, rowToVideo(d.video)]);
      return d.video;
    }
    return null;
  }, []);

  const updateVideo = useCallback(async (id: string, updates: Partial<VideoItem>) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    fetch(`/api/videos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      credentials: "include", body: JSON.stringify(updates),
    }).catch(() => {});
  }, []);

  const deleteVideo = useCallback(async (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    fetch(`/api/videos/${id}`, {
      method: "DELETE", headers: { "X-CSRF-Token": csrf }, credentials: "include",
    }).catch(() => {});
  }, []);

  return { videos, initialized, addVideo, updateVideo, deleteVideo };
}
