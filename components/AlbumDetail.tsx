"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PhotoAlbum, StandalonePhoto, GalleryImage, LoveEntry } from "@/lib/types";
import { thumb } from "@/lib/image-url";
import SortablePhotoGrid from "./SortablePhotoGrid";
import GalleryCard from "./GalleryCard";
import PhotoLightbox from "./PhotoLightbox";
import { useAuth } from "@/lib/auth/auth-context";
import { useAlbumLibrary } from "@/hooks/useAlbumLibrary";
import { useTheme } from "@/hooks/useTheme";

interface AlbumDetailProps {
  album: PhotoAlbum;
  allPhotos: StandalonePhoto[];
  isDark?: boolean;
  entries?: LoveEntry[];
  onBack: () => void;
  onPhotosChanged: () => void;
}

export default function AlbumDetail({ album, allPhotos, isDark: isDarkProp, entries = [], onBack, onPhotosChanged }: AlbumDetailProps) {
  const { theme } = useTheme();
  const isDark = isDarkProp ?? theme === "dark";
  const { isAdmin } = useAuth();
  const { updateAlbum } = useAlbumLibrary();
  const [albumPhotos, setAlbumPhotos] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickSelected, setPickSelected] = useState<Set<string>>(new Set());
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  // Title + description editing — maintain local overrides since album prop
  // doesn't update from a separate useAlbumLibrary instance in the parent.
  const [localTitle, setLocalTitle] = useState(album.title);
  const [editTitle, setEditTitle] = useState(album.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editDescription, setEditDescription] = useState(album.description || "");
  const [localDescription, setLocalDescription] = useState(album.description || "");

  // Sync from prop on album change
  useEffect(() => { setLocalTitle(album.title); setLocalDescription(album.description || ""); }, [album.id, album.title, album.description]);

  // Fetch album photos
  useEffect(() => {
    setLoading(true);
    fetch(`/api/albums/${album.id}/photos`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const items = d.photos as { photoId: string; sortOrder: number }[];
          const imgs: GalleryImage[] = items.map((item, i) => {
            const p = allPhotos.find(ap => ap.id === item.photoId);
            const entry = p?.entryId ? entries.find(e => e.id === p.entryId) : undefined;
            return {
              id: item.photoId,
              src: p?.src || "",
              caption: p?.caption || "",
              date: p?.date || "",
              width: p?.width || 800,
              height: p?.height || 600,
              sortOrder: i,
              rotation: p?.rotation ?? 0,
              _entryId: p?.entryId || undefined,
              _entryTitle: entry?.title,
              _entryContent: entry ? [entry.content_author1, entry.content_author2].filter(Boolean).join("\n\n") || "" : undefined,
            };
          });
          setAlbumPhotos(imgs);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [album.id, allPhotos, entries]);

  const flatImages = albumPhotos;
  const lightboxIndex = lightboxId ? flatImages.findIndex(img => img.id === lightboxId) : -1;

  // Reorder in album
  const handleReorder = useCallback((ordered: GalleryImage[]) => {
    setAlbumPhotos(ordered);
    const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    fetch(`/api/albums/${album.id}/photos/reorder`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      credentials: "include", body: JSON.stringify({ orderedIds: ordered.map(img => img.id) }),
    }).catch(() => {});
  }, [album.id]);

  // Add selected photos from picker + refresh the album
  const handleAddPhotos = async () => {
    if (pickSelected.size === 0) return;
    const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    await fetch(`/api/albums/${album.id}/photos`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      credentials: "include", body: JSON.stringify({ photoIds: [...pickSelected] }),
    });
    // Refresh album photos from server
    const res = await fetch(`/api/albums/${album.id}/photos`);
    const d = await res.json();
    if (d.success) {
      const items = d.photos as { photoId: string; sortOrder: number }[];
      setAlbumPhotos(items.map((item, i) => {
        const p = allPhotos.find(ap => ap.id === item.photoId);
        const entry = p?.entryId ? entries.find(e => e.id === p.entryId) : undefined;
        return {
          id: item.photoId, src: p?.src || "", caption: p?.caption || "",
          date: p?.date || "", width: p?.width || 800, height: p?.height || 600,
          sortOrder: i, rotation: p?.rotation ?? 0,
          _entryId: p?.entryId || undefined,
          _entryTitle: entry?.title,
          _entryContent: entry ? [entry.content_author1, entry.content_author2].filter(Boolean).join("\n\n") || "" : undefined,
        };
      }));
    }
    setPickerOpen(false);
    setPickSelected(new Set());
    onPhotosChanged();
  };

  // Remove a photo from album
  const handleDeletePhoto = useCallback((photoId: string) => {
    const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    fetch(`/api/albums/${album.id}/photos`, {
      method: "DELETE", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      credentials: "include", body: JSON.stringify({ photoIds: [photoId] }),
    }).then(() => {
      setAlbumPhotos(prev => prev.filter(p => p.id !== photoId));
      onPhotosChanged();
    }).catch(() => {});
  }, [album.id, onPhotosChanged]);

  // All standalone photos for picker (memoized for performance)
  const pickablePhotos = useMemo(() =>
    allPhotos.filter(p => !albumPhotos.some(ap => ap.id === p.id)),
    [allPhotos, albumPhotos]
  );

  // Group pickable photos by date (memoized — was inline IIFE causing re-renders)
  const pickerGroups = useMemo(() => {
    const sorted = [...pickablePhotos].sort((a, b) => b.date.localeCompare(a.date));
    const groups = new Map<string, typeof sorted>();
    for (const p of sorted) {
      const d = p.date || "未知日期";
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(p);
    }
    return [...groups.entries()];
  }, [pickablePhotos]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <button onClick={onBack}
            className={`text-[11px] tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
              isDark ? "border-white/[0.08] text-white/50 hover:text-white/80" : "border-[#3D3533]/08 text-[#3D3533]/50 hover:text-[#3D3533]/80"
            }`}>
            ← 返回相簿列表
          </button>
          {isAdmin && (
            <button onClick={() => { setPickSelected(new Set()); setPickerOpen(true); }}
              className={`text-[11px] tracking-wider px-4 py-2 rounded-full border transition-colors ${
                isDark ? "border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/[0.15]" : "border-[#3D3533]/08 text-[#3D3533]/40 hover:text-[#3D3533]/70"
              }`}>
              + 添加照片
            </button>
          )}
        </div>

        {/* Title — inline editable */}
        <div>
          {editingTitle && isAdmin ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { const t = editTitle.trim(); if (t) { updateAlbum(album.id, { title: t }); setLocalTitle(t); } setEditingTitle(false); } }}
                onBlur={() => { const t = editTitle.trim(); if (t) { updateAlbum(album.id, { title: t }); setLocalTitle(t); } else { setEditTitle(localTitle); } setEditingTitle(false); }}
                className={`text-2xl font-light tracking-wide bg-transparent border-b outline-none ${isDark ? "border-white/20 text-white" : "border-[#3D3533]/20 text-[#3D3533]"}`} />
            </div>
          ) : (
            <h2 onClick={() => { if (isAdmin) { setEditTitle(localTitle); setEditingTitle(true); } }}
              className={`text-2xl font-light tracking-wide ${isAdmin ? "cursor-pointer hover:opacity-70" : ""} ${isDark ? "text-white" : "text-[#3D3533]"}`}>
              {localTitle}
            </h2>
          )}
          <p className={`text-[11px] tracking-wider mt-0.5 ${isDark ? "text-white/25" : "text-[#3D3533]/35"}`}>
            {albumPhotos.length} 张照片
          </p>
        </div>

        {/* Description — one-liner below title, like diary summary */}
        {isAdmin ? (
          <textarea value={editDescription} onChange={e => { setEditDescription(e.target.value); setLocalDescription(e.target.value); }}
            onBlur={() => updateAlbum(album.id, { description: editDescription })}
            placeholder="一句话概括这个相簿…" rows={1}
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none transition-colors ${
              isDark ? "bg-transparent border-white/[0.08] text-white/60 placeholder:text-white/12 focus:border-white/20" : "bg-transparent border-[#3D3533]/08 text-[#3D3533]/60 placeholder:text-[#3D3533]/18 focus:border-[#3D3533]/20"
            }`} />
        ) : localDescription ? (
          <p className={`text-sm leading-relaxed tracking-wide ${isDark ? "text-white/40" : "text-[#3D3533]/50"}`}>{localDescription}</p>
        ) : null}
      </div>

      {/* Photos */}
      {loading ? (
        <div className="flex justify-center py-16">
          <p className={`text-[11px] tracking-wider ${isDark ? "text-white/15" : "text-[#3D3533]/20"}`}>加载中…</p>
        </div>
      ) : albumPhotos.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <span className="text-4xl block mb-3 opacity-15">📸</span>
            <p className={`text-[11px] tracking-wider ${isDark ? "text-white/20" : "text-[#3D3533]/25"}`}>
              相簿是空的 — 点「+ 添加照片」从照片墙选择
            </p>
          </div>
        </div>
      ) : (
        <>
          <SortablePhotoGrid
            items={albumPhotos}
            disabled={!isAdmin}
            onReorder={handleReorder}
            containerClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            renderItem={(img, idx) => (
              <GalleryCard
                image={img}
                index={idx}
                isDark={isDark}
                variant="masonry"
                onClick={() => setLightboxId(img.id)}
              />
            )}
          />

          {/* Lightbox */}
          {lightboxIndex >= 0 && (
            <PhotoLightbox
              images={flatImages}
              selectedIndex={lightboxIndex}
              entries={entries}
              onClose={() => setLightboxId(null)}
              onNavigate={(i) => setLightboxId(flatImages[i]?.id ?? null)}
              onDeletePhoto={isAdmin ? handleDeletePhoto : undefined}
            />
          )}
        </>
      )}

      {/* Photo picker panel — date-grouped side panel */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setPickerOpen(false)}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`w-full md:w-[480px] h-full flex flex-col shadow-2xl ${isDark ? "bg-[#0e0e0e] border-l border-white/[0.06]" : "bg-[#FBF7F2] border-l border-[#3D3533]/06"}`}
              onClick={e => e.stopPropagation()}>
              <div className={`flex items-center justify-between px-5 py-4 shrink-0 border-b ${isDark ? "border-white/[0.06]" : "border-[#3D3533]/06"}`}>
                <div>
                  <p className={`text-sm tracking-wider ${isDark ? "text-white/80" : "text-[#3D3533]/80"}`}>选择照片</p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? "text-white/25" : "text-[#3D3533]/35"}`}>
                    已选 {pickSelected.size} 张 · 共 {pickablePhotos.length} 张可选
                  </p>
                </div>
                <button onClick={() => setPickerOpen(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "text-white/30 hover:text-white/60" : "text-[#3D3533]/40 hover:text-[#3D3533]/70"}`}>✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {pickablePhotos.length === 0 ? (
                  <p className={`text-[11px] text-center mt-12 ${isDark ? "text-white/15" : "text-[#3D3533]/25"}`}>所有照片已在相簿中</p>
                ) : (
                  <div className="space-y-8">
                    {pickerGroups.map(([dateStr, items]) => (
                      <section key={dateStr}>
                        <h3 className={`text-sm font-light tracking-wider mb-3 pb-1.5 border-b ${isDark ? "text-white/40 border-white/[0.04]" : "text-[#3D3533]/50 border-[#3D3533]/04"}`}>
                          {dateStr} <span className="text-[11px] ml-1 opacity-40">{items.length} 张</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {items.map(p => {
                            const sel = pickSelected.has(p.id);
                            return (
                              <button key={p.id} onClick={() => {
                                const next = new Set(pickSelected);
                                sel ? next.delete(p.id) : next.add(p.id);
                                setPickSelected(next);
                              }} className={`text-left rounded-lg overflow-hidden border-2 transition-all ${
                                sel ? (isDark ? "border-emerald-400/60 bg-emerald-400/[0.04]" : "border-emerald-600/60 bg-emerald-50")
                                     : (isDark ? "border-transparent hover:border-white/[0.08]" : "border-transparent hover:border-[#3D3533]/08")
                              }`}>
                                <div className="aspect-[4/3] bg-[#0a0a0a] relative">
                                  {(p.src.startsWith("/api/uploads/") || p.src.startsWith("http")) ? (
                                    <img src={thumb(p.src, 480)} alt={p.caption} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="absolute inset-0 flex items-center justify-center text-2xl opacity-20">✦</span>
                                  )}
                                  {sel && (
                                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${isDark ? "bg-emerald-400 text-black" : "bg-emerald-600 text-white"}`}>✓</div>
                                  )}
                                </div>
                                <div className={`px-2.5 py-2 ${sel ? (isDark ? "bg-emerald-400/[0.06]" : "bg-emerald-50") : ""}`}>
                                  <p className={`text-[11px] truncate font-medium ${isDark ? "text-white/70" : "text-[#3D3533]/70"}`}>{p.caption || "无标题"}</p>
                                  <p className={`text-[10px] mt-0.5 ${isDark ? "text-white/25" : "text-[#3D3533]/35"}`}>{p.date}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
              <div className={`flex items-center justify-between px-5 py-4 shrink-0 border-t gap-3 ${isDark ? "border-white/[0.06]" : "border-[#3D3533]/06"}`}>
                <button onClick={() => setPickerOpen(false)}
                  className={`text-[11px] px-4 py-2 rounded-full ${isDark ? "text-white/25 hover:text-white/45" : "text-[#3D3533]/30 hover:text-[#3D3533]/50"}`}>取消</button>
                <button onClick={handleAddPhotos} disabled={pickSelected.size === 0}
                  className={`text-[12px] tracking-wider px-6 py-2 rounded-full font-medium transition-all ${
                    pickSelected.size > 0
                      ? (isDark ? "bg-white text-black hover:bg-white/90" : "bg-[#3D3533] text-white hover:bg-[#3D3533]/90")
                      : (isDark ? "bg-white/[0.05] text-white/15 cursor-not-allowed" : "bg-[#3D3533]/[0.05] text-[#3D3533]/15 cursor-not-allowed")
                  }`}>添加 {pickSelected.size > 0 ? `${pickSelected.size} 张` : "选中照片"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
