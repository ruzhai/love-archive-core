"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEventLibrary } from "@/hooks/useEventLibrary";
import { usePhotoLibrary } from "@/hooks/usePhotoLibrary";
import PhotoTimeline from "@/components/PhotoTimeline";
import type { GalleryImage } from "@/lib/types";
import { thumb } from "@/lib/image-url";
import { useAuth } from "@/lib/auth/auth-context";
import { useUploadProgress } from "@/hooks/useUploadProgress";
import { useAlbumLibrary } from "@/hooks/useAlbumLibrary";
import AlbumCard from "@/components/AlbumCard";
import AlbumDetail from "@/components/AlbumDetail";
import SortablePhotoGrid from "@/components/SortablePhotoGrid";
import PageHeader from "@/components/PageHeader";

export default function GalleryPage() {
  const { events, addEvent, updateEvent } = useEventLibrary();
  const { photos, addPhoto, updatePhoto, deletePhoto, linkPhotoToEntry } = usePhotoLibrary();
  const { isAdmin } = useAuth();
  const { addTask, updateTask, removeTask } = useUploadProgress();
  const router = useRouter();
  const { albums, initialized: albumsReady, addAlbum, deleteAlbum, reorderAlbums, refreshAlbums } = useAlbumLibrary();

  // View mode: timeline (date-grouped) or albums
  const [viewMode, setViewMode] = useState<"timeline" | "albums">("timeline");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build GalleryImages from standalone photos + entry metadata, sorted newest first
  const allImages = useMemo((): GalleryImage[] => {
    const imgs = photos.map(p => {
      const entry = p.entryId ? events.find(e => e.id === p.entryId) : null;
      return {
        id: p.id,
        src: p.src,
        caption: p.caption,
        date: p.date,
        width: p.width || 800,
        height: p.height || 600,
        sortOrder: p.sortOrder ?? 0,
        rotation: p.rotation ?? 0,
        _entryId: p.entryId || undefined,
        _entryTitle: entry?.title,
        _entryContent: entry
          ? [entry.content_author1, entry.content_author2].filter(Boolean).join("\n\n") || ""
          : undefined,
      };
    });
    imgs.sort((a, b) => b.date.localeCompare(a.date));
    return imgs;
  }, [photos, events]);

  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    if (allImages.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % allImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [allImages.length]);

  // ---- Upload ----
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const taskId = addTask(file.name);
      try {
        const fd = new FormData(); fd.append("file", file);
        const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve) => {
          xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) updateTask(taskId, Math.round((ev.loaded / ev.total) * 100)); };
          xhr.onload = () => {
            try {
              const json = JSON.parse(xhr.responseText);
              if (json.success) {
                addPhoto({ caption: file.name.replace(/\.[^.]+$/, ""), date: new Date().toISOString().slice(0, 10), src: json.url, width: 800, height: 600, sortOrder: 0, rotation: 0, entryId: null });
                updateTask(taskId, 100, "done");
              } else updateTask(taskId, 100, "error");
            } catch { updateTask(taskId, 100, "error"); }
            resolve();
          };
          xhr.onerror = () => { updateTask(taskId, 100, "error"); resolve(); };
          xhr.open("POST", "/api/upload/photo");
          xhr.setRequestHeader("X-CSRF-Token", token);
          xhr.send(fd);
        });
      } catch { }
      setTimeout(() => removeTask(taskId), 3500);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeletePhoto = useCallback((photoId: string) => {
    if (!isAdmin) return;
    deletePhoto(photoId);
  }, [deletePhoto, isAdmin]);

  const handleCaptionChange = useCallback((photoId: string, caption: string) => {
    if (!isAdmin) return;
    updatePhoto(photoId, { caption });
  }, [updatePhoto, isAdmin]);

  const handleDateChange = useCallback((photoId: string, newDate: string) => {
    if (!isAdmin) return;
    updatePhoto(photoId, { date: newDate });
  }, [updatePhoto, isAdmin]);

  const handleRotate = useCallback((photoId: string, newRotation: number) => {
    if (!isAdmin) return;
    updatePhoto(photoId, { rotation: newRotation });
  }, [updatePhoto, isAdmin]);

  // Wall drag-and-drop reorder: update local sortOrder + persist to server
  const handlePhotosReorder = useCallback((orderedIds: string[]) => {
    orderedIds.forEach((id, i) => updatePhoto(id, { sortOrder: i }));
    const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
    fetch("/api/photos/reorder", {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      credentials: "include", body: JSON.stringify({ orderedIds }),
    }).catch(() => {});
  }, [updatePhoto]);

  // Create (or reuse) that day's diary entry, link this photo to it, and jump
  // into the diary editor. If a diary already exists for the photo's date but
  // doesn't reference the photo, we just attach the photo to it and edit.
  const handleAddToDiary = useCallback(async (image: GalleryImage) => {
    if (!isAdmin) return;
    const date = image.date;
    const existing = events.find(e => e.date === date);
    let entryId: string;
    try {
      if (existing) {
        entryId = existing.id;
        if (!(existing.photoIds || []).includes(image.id)) {
          await updateEvent(existing.id, { photoIds: [...(existing.photoIds || []), image.id] });
        }
      } else {
        const newEntry = await addEvent({
          title: `${date} 的日记`,
          summary: "",
          date,
          content_author1: "",
          content_author2: "",
          photos: [],
          photoIds: [image.id],
        } as any);
        if (!newEntry) return;
        entryId = newEntry.id;
      }
      linkPhotoToEntry(image.id, entryId);
    } catch {
      // Server rejected the save — the photo stays standalone and we simply
      // don't navigate into a diary that doesn't actually exist.
      return;
    }
    router.push(`/diary?entry=${entryId}&edit=1`);
  }, [isAdmin, events, addEvent, updateEvent, linkPhotoToEntry, router]);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="container-page">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <PageHeader
            supertitle="Memory Fragments"
            title="照片墙"
            subtitle="散落的记忆碎片，拼成我们走过的路。"
            className="mb-0"
          />
          {isAdmin && (
            <label className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer transition-all duration-300 shrink-0 mt-3
              text-[11px] tracking-widest font-medium bg-page-heading text-bg-primary hover:opacity-90
              ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>{uploading ? "上传中…" : "上传照片"}</span>
            </label>
          )}
        </div>

        <div className="h-10" />

        {/* View mode tabs */}
        <div className="flex items-center gap-3 mb-10">
          {(["timeline", "albums"] as const).map(mode => (
            <button key={mode} onClick={() => { setViewMode(mode); setSelectedAlbumId(null); }}
              className={`text-sm tracking-wider px-4 py-2 rounded-full transition-all font-medium ${
                viewMode === mode
                  ? "bg-page-heading text-bg-primary"
                  : "text-page-supertitle hover:text-page-heading"
              }`}>
              {mode === "timeline" ? "📅 时间线" : "📁 相簿"}
            </button>
          ))}
        </div>

        {/* ---- TIMELINE VIEW ---- */}
        {viewMode === "timeline" && (
          allImages.length === 0 ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <span className="text-4xl block mb-4 opacity-20">📷</span>
                <p className="text-xs tracking-wider text-page-supertitle">
                  还没有照片，点击"+ 上传照片"，或在日记里添加
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Hero photo */}
              {allImages.length > 0 && (() => {
                const hero = allImages[heroIndex];
                const heroIsReal = hero.src.startsWith("/api/uploads/") || hero.src.startsWith("http");
                return (
                  <motion.div
                    key={heroIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="mb-16 relative rounded-2xl overflow-hidden gradient-border"
                  >
                    <div className="aspect-[21/9] md:aspect-[21/7] relative overflow-hidden rounded-2xl">
                      {heroIsReal ? (
                        <img src={thumb(hero.src, 1600)} alt={hero.caption} decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
                          <span className="text-8xl opacity-10">✦</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
                      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                        <p className="text-white/90 text-xl md:text-3xl font-light tracking-wider leading-relaxed">
                          {hero.caption || "记忆碎片"}
                        </p>
                        <p className="text-white/40 text-xs mt-3 tracking-widest">
                          {hero.date}
                          {hero._entryTitle && (
                            <a href={`/diary?entry=${hero._entryId}`} className="ml-3 text-amber-400/50 hover:text-amber-400/80 transition-colors">
                              📖 {hero._entryTitle}
                            </a>
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              <PhotoTimeline
                images={allImages}
                isAdmin={isAdmin}
                onDeletePhoto={isAdmin ? handleDeletePhoto : undefined}
                onCaptionChange={isAdmin ? handleCaptionChange : undefined}
                onDateChange={isAdmin ? handleDateChange : undefined}
                onAddToDiary={isAdmin ? handleAddToDiary : undefined}
                onRotate={isAdmin ? handleRotate : undefined}
                onPhotosReorder={isAdmin ? handlePhotosReorder : undefined}
                entries={events}
              />
            </>
          )
        )}

        {/* ---- ALBUM VIEW ---- */}
        {viewMode === "albums" && (selectedAlbumId ? (
          <AlbumDetail
            album={albums.find(a => a.id === selectedAlbumId)!}
            allPhotos={photos}
            entries={events}
            onBack={() => setSelectedAlbumId(null)}
            onPhotosChanged={() => refreshAlbums()}
          />
        ) : (
          <>
            {/* Create album dialog */}
            {showCreateAlbum && (
              <div className="fixed inset-0 z-[140] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateAlbum(false)}>
                <div className="w-full max-w-sm rounded-2xl p-6 bg-modal-bg border border-modal-border"
                  onClick={e => e.stopPropagation()}>
                  <p className="text-sm tracking-wider mb-4 text-page-heading">新建相簿</p>
                  <input autoFocus value={newAlbumTitle} onChange={e => setNewAlbumTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newAlbumTitle.trim()) { addAlbum(newAlbumTitle.trim()).then(() => { setNewAlbumTitle(""); setShowCreateAlbum(false); }); } }}
                    placeholder="相簿名称…" className="w-full bg-transparent border-b px-1 py-2 text-sm outline-none mb-4 border-modal-input-border text-modal-input-text placeholder:text-page-footer-text" />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setShowCreateAlbum(false); setNewAlbumTitle(""); }}
                      className="text-[11px] px-4 py-2 rounded-full text-page-supertitle hover:text-page-heading transition-colors">取消</button>
                    <button onClick={() => { if (newAlbumTitle.trim()) { addAlbum(newAlbumTitle.trim()).then(() => { setNewAlbumTitle(""); setShowCreateAlbum(false); }); } }}
                      disabled={!newAlbumTitle.trim()}
                      className={`text-[11px] tracking-wider px-4 py-2 rounded-full font-medium transition-all ${
                        newAlbumTitle.trim() ? "bg-page-heading text-bg-primary hover:opacity-90" : "bg-bg-secondary text-page-footer-text cursor-not-allowed"
                      }`}>创建</button>
                  </div>
                </div>
              </div>
            )}

            {!albumsReady ? (
              <div className="flex justify-center py-16"><p className="text-[11px] text-page-footer-text">加载中…</p></div>
            ) : albums.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <span className="text-4xl block mb-3 opacity-15">📁</span>
                  <p className="text-[11px] tracking-wider mb-4 text-page-supertitle">还没有相簿</p>
                  {isAdmin && (
                    <button onClick={() => setShowCreateAlbum(true)}
                      className="text-[11px] tracking-wider px-4 py-2 rounded-full border border-page-footer-border text-page-subtitle hover:text-page-heading transition-colors">
                      + 创建第一个相簿
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[11px] tracking-wider text-page-supertitle">
                    {albums.length} 个相簿
                  </p>
                  {isAdmin && (
                    <button onClick={() => setShowCreateAlbum(true)}
                      className="text-[11px] tracking-wider px-3 py-1.5 rounded-full border transition-colors border-page-footer-border text-page-supertitle hover:text-page-heading">
                      + 新建相簿
                    </button>
                  )}
                </div>
                <SortablePhotoGrid
                  items={albums}
                  disabled={!isAdmin}
                  onReorder={(ordered) => {
                    reorderAlbums(ordered.map(a => a.id));
                  }}
                  containerClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                  renderItem={(album) => (
                    <AlbumCard
                      album={album}
                      allPhotos={photos.map(p => ({ id: p.id, src: p.src, width: p.width, height: p.height }))}
                      onClick={() => setSelectedAlbumId(album.id)}
                      onDelete={isAdmin ? deleteAlbum : undefined}
                    />
                  )}
                />
              </div>
            )}
          </>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mt-24 pt-10 border-t border-page-footer-border"
        >
          <p className="text-[11px] tracking-widest text-page-footer-text">
            · 日记里的照片自动同步至此 ·
          </p>
        </motion.div>
      </div>
    </div>
  );
}
