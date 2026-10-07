"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GalleryImage, LoveEntry, PhotoComment } from "@/lib/types";
import { formatDate } from "@/lib/data";
import { authorLabel } from "@/lib/config";
import { thumb } from "@/lib/image-url";
import { renderMarkdown } from "@/lib/markdown";
import { useAuth } from "@/lib/auth/auth-context";
import { useTheme } from "@/hooks/useTheme";
import { useAlbumLibrary } from "@/hooks/useAlbumLibrary";

interface PhotoLightboxProps {
  images: GalleryImage[];
  selectedIndex: number;
  entries?: LoveEntry[]; // for looking up full diary context
  onClose: () => void;
  onNavigate: (index: number) => void;
  onCaptionChange?: (photoId: string, newCaption: string) => void;
  onDateChange?: (photoId: string, newDate: string) => void;
  onDeletePhoto?: (photoId: string) => void;
  onAddToDiary?: (image: GalleryImage) => void;
  onRotate?: (photoId: string, newRotation: number) => void;
}

export default function PhotoLightbox({
  images,
  selectedIndex,
  entries = [],
  onClose,
  onNavigate,
  onCaptionChange,
  onDateChange,
  onDeletePhoto,
  onAddToDiary,
  onRotate,
}: PhotoLightboxProps) {
  const { isAdmin, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { albums, addPhotosToAlbum, refreshAlbums } = useAlbumLibrary();
  const current = images[selectedIndex];
  const [editCaption, setEditCaption] = useState("");

  // ---- Album picker ----
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [albumAdding, setAlbumAdding] = useState(false);

  // ---- Comments state ----
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentAuthor, setCommentAuthor] = useState<"author1" | "author2">("author1");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Load comments when current photo changes
  useEffect(() => {
    if (!current) return;
    setCommentsLoading(true);
    setComments([]);
    fetch(`/api/photos/${current.id}/comments`)
      .then(r => r.json())
      .then(d => { if (d.success) setComments(d.comments); })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [current?.id]);

  const handleAddComment = async () => {
    if (!newComment.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
      const res = await fetch(`/api/photos/${current.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        credentials: "include",
        body: JSON.stringify({ author: commentAuthor, content: newComment.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => [...prev, data.comment]);
        setNewComment("");
      }
    } catch {} finally { setCommentSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
      await fetch(`/api/photos/${current.id}/comments/${commentId}`, {
        method: "DELETE", headers: { "X-CSRF-Token": csrf }, credentials: "include",
      });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {}
  };

  // Look up full diary entry
  const entry = entries.find(e => e.id === current?._entryId);

  // Sync caption when navigating
  useEffect(() => {
    if (current) setEditCaption(current.caption || "");
  }, [current]);

  // Find the author of the logged-in user
  const loggedAuthor = user?.username === "author2" ? "author2" : user?.username === "author1" ? "author1" : null;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't navigate when user is typing in an input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
    if (e.key === "Escape") onClose();
    if (isInput) return;
    if (e.key === "ArrowLeft") {
      const next = (selectedIndex - 1 + images.length) % images.length;
      onNavigate(next);
    }
    if (e.key === "ArrowRight") {
      const next = (selectedIndex + 1) % images.length;
      onNavigate(next);
    }
  }, [selectedIndex, images.length, onClose, onNavigate]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Save caption
  const saveCaption = () => {
    if (current && editCaption !== current.caption && onCaptionChange) {
      onCaptionChange(current.id, editCaption);
    }
  };

  if (!current) return null;

  const isRealPhoto = current.src.startsWith("/api/uploads/") || current.src.startsWith("http");

  // ---- Build info rows ----
  const infoItems: { label: string; value: string; html?: boolean }[] = [];
  if (entry) {
    infoItems.push({ label: "所属日记", value: entry.title });
    if (entry.mood) {
      infoItems.push({ label: "心情", value: entry.mood });
    }
    // Show diary excerpts — logged-in user's first, then the other
    const author1Excerpt = entry.content_author1?.slice(0, 200);
    const author2Excerpt = entry.content_author2?.slice(0, 200);
    if (loggedAuthor === "author2" && author2Excerpt) {
      infoItems.push({ label: `${authorLabel("author2")} 的记录`, value: author2Excerpt + (entry.content_author2!.length > 200 ? "…" : ""), html: true });
      if (author1Excerpt) infoItems.push({ label: `${authorLabel("author1")} 的记录`, value: author1Excerpt + (entry.content_author1!.length > 200 ? "…" : ""), html: true });
    } else {
      if (author1Excerpt) infoItems.push({ label: `${authorLabel("author1")} 的记录`, value: author1Excerpt + (entry.content_author1!.length > 200 ? "…" : ""), html: true });
      if (author2Excerpt) infoItems.push({ label: `${authorLabel("author2")} 的记录`, value: author2Excerpt + (entry.content_author2!.length > 200 ? "…" : ""), html: true });
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`fixed inset-0 z-[110] backdrop-blur-2xl flex flex-col ${
          isDark ? "bg-black/95" : "bg-[#FBF7F2]/95"
        }`}
        onClick={onClose}
      >
        {/* ---- Top bar ---- */}
        <div className={`relative z-10 flex items-center justify-between px-6 py-3 shrink-0 ${
          isDark ? "" : "bg-[#FBF7F2]/40 backdrop-blur-sm"
        }`} onClick={e => e.stopPropagation()}>
          {/* Left: photo count */}
          <span className={`text-[11px] tracking-widest tabular-nums ${
            isDark ? "text-white/20" : "text-[#3D3533]/35"
          }`}>
            {selectedIndex + 1} <span className={isDark ? "text-white/10" : "text-[#3D3533]/18"}>/</span> {images.length}
          </span>

          {/* Center: label */}
          <div className="flex items-center gap-3">
            <span className={`text-[11px] tracking-[0.3em] uppercase ${
              isDark ? "text-white/12" : "text-[#3D3533]/25"
            }`}>
              照片详情
            </span>
            {isAdmin && onRotate && (
              <button
                onClick={() => onRotate(current.id, ((current.rotation ?? 0) + 90) % 360)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs tracking-wider font-medium transition-all duration-300 ${
                  isDark
                    ? "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-400/30"
                    : "bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-300/50"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <path d="M2 7a5 5 0 0 1 8.5-3.5M12 7a5 5 0 0 1-8.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M9.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                旋转
              </button>
            )}
          </div>

          {/* Right: close button — prominent, impossible to miss */}
          <button
            onClick={onClose}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs tracking-wider font-medium transition-all duration-300 shadow-lg ${
              isDark
                ? "bg-white text-black hover:bg-white/90 hover:shadow-white/10"
                : "bg-[#3D3533] text-[#FBF7F2] hover:bg-[#3D3533]/90 hover:shadow-[#3D3533]/10"
            }`}
          >
            <span>关闭</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ---- Main content ---- */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Photo area — clicking photo closes lightbox */}
          <div
            className="flex-1 flex items-center justify-center p-4 lg:p-8 relative min-h-0 cursor-pointer"
          >
            {/* Nav arrows */}
            <button
              onClick={e => { e.stopPropagation(); onNavigate((selectedIndex - 1 + images.length) % images.length); }}
              className="absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-all duration-300"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); onNavigate((selectedIndex + 1) % images.length); }}
              className="absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-all duration-300"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            {/* Image */}
            <motion.div
              key={current.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="w-full h-full flex items-center justify-center"
            >
              {isRealPhoto ? (
                <div style={current.rotation ? { transform: `rotate(${current.rotation}deg)` } : undefined}>
                  <img
                    src={thumb(current.src, 1600)}
                    alt={current.caption || ""}
                    loading="eager"
                    decoding="async"
                    className="max-w-full max-h-full object-contain rounded-lg"
                    style={{ maxHeight: "calc(100vh - 200px)" }}
                  />
                </div>
              ) : (
                <div className="w-full max-w-2xl aspect-[4/3] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-lg flex items-center justify-center">
                  <span className="text-8xl opacity-10">📷</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Info side panel (desktop) / bottom drawer (mobile) — clicking closes */}
          <div
            className={`lg:w-[340px] xl:w-[380px] shrink-0 lg:h-full overflow-y-auto cursor-pointer
                        max-lg:max-h-[40vh] max-lg:border-t
                        flex flex-col
                        ${
                          isDark
                            ? "bg-black/40 backdrop-blur-sm border-white/[0.06]"
                            : "bg-[#FBF7F2]/90 backdrop-blur-sm border-[#3D3533]/08"
                        }`}
          >
            <div className="p-5 lg:p-6 flex-1 space-y-5" onClick={e => e.stopPropagation()}>
              {/* Caption — editable for admin */}
              <div>
                <label className={`text-[11px] tracking-[0.2em] uppercase block mb-2 ${
                  isDark ? "text-white/20" : "text-[#3D3533]/30"
                }`}>
                  标题
                </label>
                {isAdmin && onCaptionChange ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editCaption}
                      onChange={e => setEditCaption(e.target.value)}
                      onBlur={saveCaption}
                      onKeyDown={e => { if (e.key === "Enter") { saveCaption(); e.currentTarget.blur(); } }}
                      className={`flex-1 bg-transparent border-b py-1.5 px-1 text-sm outline-none transition-colors ${
                        isDark
                          ? "border-white/[0.08] text-white/75 focus:border-white/20 placeholder:text-white/15"
                          : "border-[#3D3533]/10 text-[#3D3533]/70 focus:border-[#3D3533]/25 placeholder:text-[#3D3533]/20"
                      }`}
                      placeholder="添加标题…"
                    />
                    {editCaption !== current.caption && (
                      <button
                        onClick={saveCaption}
                        className={`text-[11px] tracking-wider shrink-0 transition-colors ${
                          isDark ? "text-amber-400/60 hover:text-amber-400" : "text-[#C97D6B]/60 hover:text-[#C97D6B]"
                        }`}
                      >
                        保存
                      </button>
                    )}
                  </div>
                ) : (
                  <p className={`text-sm tracking-wide leading-relaxed ${
                    isDark ? "text-white/70" : "text-[#3D3533]/75"
                  }`}>
                    {current.caption || "（无标题）"}
                  </p>
                )}
              </div>

              {/* Date — editable for admin */}
              {(current.date || (isAdmin && onDateChange)) && (
                <div>
                  <label className={`text-[11px] tracking-[0.2em] uppercase block mb-2 ${
                    isDark ? "text-white/20" : "text-[#3D3533]/30"
                  }`}>
                    日期
                  </label>
                  {isAdmin && onDateChange ? (
                    <input
                      type="date"
                      value={current.date || ""}
                      onChange={e => onDateChange(current.id, e.target.value)}
                      style={{ colorScheme: isDark ? "dark" : "light" }}
                      className={`bg-transparent border-b py-1.5 px-1 text-sm outline-none transition-colors ${
                        isDark
                          ? "border-white/[0.08] text-white/75 focus:border-white/20"
                          : "border-[#3D3533]/10 text-[#3D3533]/70 focus:border-[#3D3533]/25"
                      }`}
                    />
                  ) : (
                    <p className={`text-sm tracking-wide ${
                      isDark ? "text-white/70" : "text-[#3D3533]/75"
                    }`}>
                      {formatDate(current.date)}
                    </p>
                  )}
                </div>
              )}

              {/* Info items */}
              {infoItems.map((item, i) => (
                <div key={i}>
                  <label className={`text-[11px] tracking-[0.2em] uppercase block mb-1.5 ${
                    isDark ? "text-white/20" : "text-[#3D3533]/30"
                  }`}>
                    {item.label}
                  </label>
                  {item.html ? (
                    <div
                      className={`text-xs leading-relaxed tracking-wide prose-museum italic line-clamp-4 ${
                        isDark ? "text-white/45" : "text-[#3D3533]/60"
                      }`}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(item.value.slice(0, 300)) }}
                    />
                  ) : (
                    <p className={`text-xs leading-relaxed tracking-wide line-clamp-4 ${
                      isDark ? "text-white/45" : "text-[#3D3533]/60"
                    }`}>
                      {item.value}
                    </p>
                  )}
                </div>
              ))}

              {/* ---- 💬 Comments ---- */}
              <div className={`pt-3 border-t ${isDark ? "border-white/[0.06]" : "border-[#3D3533]/06"}`}>
                <label className={`text-[11px] tracking-[0.2em] uppercase block mb-3 ${
                  isDark ? "text-white/20" : "text-[#3D3533]/30"
                }`}>
                  💬 评论 ({comments.length})
                </label>
                {commentsLoading ? (
                  <p className={`text-[11px] ${isDark ? "text-white/15" : "text-[#3D3533]/20"}`}>加载中…</p>
                ) : comments.length === 0 ? (
                  <p className={`text-[11px] ${isDark ? "text-white/15" : "text-[#3D3533]/20"}`}>暂无评论</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {comments.map(c => (
                      <div key={c.id} className="group/comment">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[11px] font-medium tracking-wider shrink-0 ${
                            c.author === "author1"
                              ? (isDark ? "text-amber-400/70" : "text-[#C97D6B]")
                              : (isDark ? "text-rose-400/70" : "text-rose-600/70")
                          }`}>
                            {authorLabel(c.author)}
                          </span>
                          <p className={`text-xs leading-relaxed flex-1 ${
                            isDark ? "text-white/60" : "text-[#3D3533]/65"
                          }`}>
                            {c.content}
                          </p>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className={`opacity-0 group-hover/comment:opacity-100 text-[11px] shrink-0 transition-opacity ${
                                isDark ? "text-white/15 hover:text-red-400/70" : "text-[#3D3533]/20 hover:text-red-500/70"
                              }`}>✕</button>
                          )}
                        </div>
                        <p className={`text-[9px] mt-0.5 tracking-wider ${
                          isDark ? "text-white/15" : "text-[#3D3533]/20"
                        }`}>
                          {new Date(c.createdAt).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {/* Add comment (admin only) */}
                {isAdmin && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] tracking-wider ${isDark ? "text-white/15" : "text-[#3D3533]/20"}`}>作者:</span>
                      {(["author1", "author2"] as const).map(a => (
                        <button key={a}
                          onClick={() => setCommentAuthor(a)}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors tracking-wider ${
                            commentAuthor === a
                              ? (isDark ? "border-white/20 text-white/70 bg-white/[0.06]" : "border-[#3D3533]/25 text-[#3D3533]/70 bg-[#3D3533]/[0.04]")
                              : (isDark ? "border-transparent text-white/25 hover:text-white/45" : "border-transparent text-[#3D3533]/25 hover:text-[#3D3533]/45")
                          }`}>{authorLabel(a)}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddComment(); }}
                        className={`flex-1 bg-transparent border-b py-1.5 px-1 text-xs outline-none transition-colors ${
                          isDark ? "border-white/[0.08] text-white/75 focus:border-white/20 placeholder:text-white/15"
                                 : "border-[#3D3533]/10 text-[#3D3533]/70 focus:border-[#3D3533]/25 placeholder:text-[#3D3533]/20"
                        }`}
                        placeholder="添加评论…"
                      />
                      <button onClick={handleAddComment}
                        disabled={!newComment.trim() || commentSubmitting}
                        className={`text-[11px] tracking-wider px-3 py-1.5 rounded-full transition-colors shrink-0 ${
                          newComment.trim() && !commentSubmitting
                            ? (isDark ? "bg-white text-black hover:bg-white/90" : "bg-[#3D3533] text-[#FBF7F2] hover:bg-[#3D3533]/90")
                            : (isDark ? "bg-white/[0.05] text-white/15 cursor-not-allowed" : "bg-[#3D3533]/[0.05] text-[#3D3533]/15 cursor-not-allowed")
                        }`}>发送</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add to album (admin) */}
              {isAdmin && (
                <div className="pt-2">
                  {showAlbumPicker ? (
                    <div className="space-y-2">
                      <p className={`text-[11px] tracking-wider ${isDark ? "text-white/20" : "text-[#3D3533]/30"}`}>选择相簿：</p>
                      <div className="space-y-1 max-h-[160px] overflow-y-auto">
                        {albums.length === 0 ? (
                          <p className={`text-[11px] ${isDark ? "text-white/15" : "text-[#3D3533]/20"}`}>还没有相簿 — 去照片墙创建</p>
                        ) : (
                          albums.map(a => (
                            <button key={a.id}
                              onClick={async () => {
                                setAlbumAdding(true);
                                await addPhotosToAlbum(a.id, [current.id]);
                                await refreshAlbums();
                                setAlbumAdding(false);
                                setShowAlbumPicker(false);
                              }}
                              disabled={albumAdding}
                              className={`w-full text-left text-[11px] tracking-wider px-3 py-1.5 rounded transition-colors ${
                                isDark ? "text-white/50 hover:text-white/80 hover:bg-white/[0.04]" : "text-[#3D3533]/50 hover:text-[#3D3533]/80 hover:bg-[#3D3533]/[0.03]"
                              }`}>📁 {a.title}</button>
                          ))
                        )}
                      </div>
                      <button onClick={() => setShowAlbumPicker(false)}
                        className={`text-[11px] ${isDark ? "text-white/20" : "text-[#3D3533]/25"}`}>取消</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAlbumPicker(true)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] transition-all tracking-wider ${
                        isDark ? "bg-white/[0.04] border-white/[0.06] text-white/45 hover:text-white/75 hover:bg-white/[0.08]" : "bg-[#3D3533]/[0.03] border-[#3D3533]/08 text-[#3D3533]/45 hover:text-[#3D3533]/75 hover:bg-[#3D3533]/[0.06]"
                      }`}>📁 加入相簿</button>
                  )}
                </div>
              )}

              {/* Entry link or unreferenced notice */}
              {current._entryId ? (
                <div className="pt-2">
                  <a
                    href={`/diary?entry=${current._entryId}`}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] transition-all tracking-wider ${
                      isDark
                        ? "bg-white/[0.04] border-white/[0.06] text-amber-400/60 hover:text-amber-400 hover:bg-white/[0.08]"
                        : "bg-[#3D3533]/[0.03] border-[#3D3533]/08 text-[#C97D6B] hover:text-[#B85C4A] hover:bg-[#3D3533]/[0.06]"
                    }`}
                  >
                    <span>📖</span> 查看完整日记
                  </a>
                </div>
              ) : (
                <div className="pt-2 space-y-2.5">
                  <p className={`text-[11px] tracking-wider italic ${
                    isDark ? "text-white/20" : "text-[#3D3533]/25"
                  }`}>
                    ✨ 这张照片还没有关联日记
                  </p>
                  {isAdmin && onAddToDiary && (
                    <button
                      onClick={() => onAddToDiary(current)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] transition-all tracking-wider ${
                        isDark
                          ? "bg-white/[0.04] border-white/[0.06] text-amber-400/70 hover:text-amber-400 hover:bg-white/[0.08]"
                          : "bg-[#3D3533]/[0.03] border-[#3D3533]/08 text-[#C97D6B] hover:text-[#B85C4A] hover:bg-[#3D3533]/[0.06]"
                      }`}
                    >
                      {entries.some(e => e.date === current.date) ? (
                        <><span>✏️</span> 修改当天日记</>
                      ) : (
                        <><span>＋</span> 写这天的日记</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Delete (admin only) */}
              {isAdmin && onDeletePhoto && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      if (window.confirm("删除这张照片？此操作不可恢复。")) {
                        onDeletePhoto(current.id);
                        onClose();
                      }
                    }}
                    className={`text-[11px] transition-colors tracking-wider ${
                      isDark ? "text-white/15 hover:text-red-400/70" : "text-[#3D3533]/25 hover:text-red-500/70"
                    }`}
                  >
                    ✕ 删除照片
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---- Filmstrip ---- */}
        {images.length > 1 && (
          <div
            className={`relative z-10 shrink-0 border-t px-4 py-3 backdrop-blur-xl ${
              isDark
                ? "border-white/[0.04] bg-black/50"
                : "border-[#3D3533]/06 bg-[#FBF7F2]/50"
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 overflow-x-auto max-w-full"
              style={{ scrollbarWidth: "thin" }}
            >
              {images.map((img, i) => {
                const isSelected = i === selectedIndex;
                const isRealThumb = img.src.startsWith("/api/uploads/") || img.src.startsWith("http");
                return (
                  <button
                    key={img.id}
                    onClick={() => onNavigate(i)}
                    className={`shrink-0 w-14 h-10 rounded-md overflow-hidden border transition-all duration-300 ${
                      isSelected
                        ? isDark
                          ? "border-white/30 opacity-100 ring-1 ring-white/10"
                          : "border-[#3D3533]/50 opacity-100 ring-1 ring-[#3D3533]/15"
                        : isDark
                          ? "border-white/[0.04] opacity-40 hover:opacity-70"
                          : "border-[#3D3533]/08 opacity-50 hover:opacity-80"
                    }`}
                  >
                    {isRealThumb ? (
                      <img src={thumb(img.src, 160)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${
                        isDark ? "bg-[#0a0a0a]" : "bg-[#EDE8E2]"
                      }`}>
                        <span className="text-[8px] opacity-30">📷</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
