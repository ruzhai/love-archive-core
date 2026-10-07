"use client";

import { useState, useEffect, useRef, useMemo, useDeferredValue } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LoveEntry, EntryPhoto } from "@/lib/types";
import { AUTHORS, authorLabel } from "@/lib/config";
import { renderMarkdown } from "@/lib/markdown";
import { thumb } from "@/lib/image-url";
import { useTheme } from "@/hooks/useTheme";
import { usePhotoLibrary } from "@/hooks/usePhotoLibrary";
import { useUploadProgress } from "@/hooks/useUploadProgress";
import SortablePhotoGrid from "./SortablePhotoGrid";

const MOODS = ["🥰", "😊", "🎉", "😢", "😤", "🤔", "😴", "❤️", "🌟", "🌧"];

type AuthorTab = "author1" | "author2";

interface EventEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: {
    title: string; summary: string; date: string;
    content_author1: string; content_author2: string;
    photos: EntryPhoto[]; photoIds: string[];
    mood?: string; firstAuthor?: string;
  }) => Promise<void>;
  editingEvent?: LoveEntry | null;
}

export default function EventEditor({ open, onClose, onSave, editingEvent }: EventEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { photos: allPhotos, addPhoto: addStandalonePhoto } = usePhotoLibrary();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Form
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(todayStr);
  const [contentAuthor1, setContentAuthor1] = useState("");
  const [contentAuthor2, setContentAuthor2] = useState("");
  const [mood, setMood] = useState("");
  const [firstAuthor, setFirstAuthor] = useState<"author1" | "author2" | "">("");
  const [photos, setPhotos] = useState<EntryPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<AuthorTab>("author1");
  const [photoPickOpen, setPhotoPickOpen] = useState(false);
  const [pickSelected, setPickSelected] = useState<Set<string>>(new Set());

  // Available standalone photos for picker
  const pickablePhotos = useMemo(() => allPhotos.filter(p => !p.entryId || p.entryId === editingEvent?.id), [allPhotos, editingEvent?.id]);

  // Photo upload
  const [uploading, setUploading] = useState(false);
  const { addTask: addProgress, updateTask: updateProgress, removeTask: removeProgress } = useUploadProgress();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Init from editing event
  useEffect(() => {
    if (!open) return;
    if (editingEvent) {
      setTitle(editingEvent.title);
      setSummary(editingEvent.summary);
      setDate(editingEvent.date);
      setContentAuthor1(editingEvent.content_author1 || "");
      setContentAuthor2(editingEvent.content_author2 || "");
      setMood(editingEvent.mood || "");
      setFirstAuthor((editingEvent.firstAuthor as "author1" | "author2" | undefined) || "");
      setPhotos(editingEvent.photos || []);
      setActiveTab((editingEvent.content_author2 && !editingEvent.content_author1) ? "author2" : "author1");
    } else {
      setTitle(""); setSummary(""); setDate(todayStr);
      setContentAuthor1(""); setContentAuthor2(""); setMood(""); setFirstAuthor("");
      setPhotos([]); setActiveTab("author1");
      setPickSelected(new Set());
    }
  }, [editingEvent, open]);

  // Resolve editingEvent.photoIds against allPhotos to rebuild the photos list.
  // The deprecated `photos` field is always [] from the server (rowToEntry
  // hardcodes it), so without this effect the editor shows an empty photo
  // section — and saving overwrites the entry's photo_ids to [].
  //
  // ChatsContent pre-resolves photoIds→photos in handleEditEvent, so in the
  // normal flow editingEvent.photos is already populated by the time we mount.
  // This effect is a safety-net: if allPhotos loaded before we mounted, it
  // resolves immediately; if it loads after, the deps trigger a retry.
  useEffect(() => {
    if (!open || !editingEvent || allPhotos.length === 0) return;
    // If photos are already resolved (by ChatsContent), just sync pickSelected
    const alreadyResolved = editingEvent.photos?.length === (editingEvent.photoIds || []).length;
    if (alreadyResolved) {
      if (editingEvent.photos && editingEvent.photos.length > 0 && pickSelected.size === 0) {
        setPickSelected(new Set(editingEvent.photos.map(p => p.id)));
      }
      return;
    }
    const photoIds = editingEvent.photoIds || [];
    if (photoIds.length === 0) return;
    const resolved: EntryPhoto[] = [];
    for (const pid of photoIds) {
      const sp = allPhotos.find(p => p.id === pid);
      if (sp) resolved.push({ id: sp.id, caption: sp.caption, date: sp.date, src: sp.src, width: sp.width, height: sp.height });
    }
    if (resolved.length > 0) {
      setPhotos(resolved);
      setPickSelected(new Set(resolved.map(p => p.id)));
    }
  }, [open, editingEvent, allPhotos]);

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const taskId = addProgress(file.name);
      try {
        const fd = new FormData(); fd.append("file", file);
        const token = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
        await new Promise<void>((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) updateProgress(taskId, Math.round((ev.loaded / ev.total) * 100)); };
          xhr.onload = async () => {
            try { const json = JSON.parse(xhr.responseText);
              if (json.success) {
                // 在照片库中创建照片，并用它返回的**真实 id** 作为条目照片 id。
                // 两边 id 必须一致，否则 entry.photoIds 关联不到库里的照片，刷新后就丢了。
                const created = await addStandalonePhoto({
                  caption: file.name.replace(/\.[^.]+$/, ""), date: date || todayStr,
                  src: json.url, width: 800, height: 600, sortOrder: 0, rotation: 0, entryId: editingEvent?.id || null,
                });
                const newPhoto: EntryPhoto = { id: created.id, caption: created.caption, date: created.date, src: created.src, width: created.width, height: created.height };
                setPhotos(prev => [...prev, newPhoto]); updateProgress(taskId, 100, "done");
              }
              else updateProgress(taskId, 100, "error");
            } catch { updateProgress(taskId, 100, "error"); }
            resolve();
          };
          xhr.onerror = () => { updateProgress(taskId, 100, "error"); resolve(); };
          xhr.open("POST", "/api/upload/photo");
          xhr.setRequestHeader("X-CSRF-Token", token);
          xhr.send(fd);
        });
      } catch { }
      setTimeout(() => removeProgress(taskId), 3500);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updatePhotoCaption = (id: string, caption: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  };

  const removePhoto = (id: string) => setPhotos(prev => prev.filter(p => p.id !== id));

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Robust clipboard write — tries modern API first, falls back to execCommand
  const copyToClipboard = (text: string): boolean => {
    try {
      // Method 1: modern async Clipboard API (requires HTTPS or localhost)
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
        return true;
      }
    } catch { /* fall through */ }
    // Method 2: legacy execCommand (works on HTTP too)
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;

    // ---- Backup: copy all content to clipboard before saving ----
    // If anything goes wrong (network, server, etc.), the content is safe.
    const backupText = [
      `标题: ${title.trim()}`,
      `日期: ${date}`,
      summary.trim() ? `摘要: ${summary.trim()}` : "",
      contentAuthor1.trim() ? `--- ${authorLabel("author1")}的日记 ---\n${contentAuthor1.trim()}` : "",
      contentAuthor2.trim() ? `--- ${authorLabel("author2")}的日记 ---\n${contentAuthor2.trim()}` : "",
    ].filter(Boolean).join("\n\n");
    copyToClipboard(backupText);

    setSaving(true);
    setSaveStatus("saving");
    try {
      await onSave({
        title: title.trim(), summary: summary.trim(), date,
        content_author1: contentAuthor1, content_author2: contentAuthor2,
        photos, photoIds: photos.map(p => p.id),
        mood: mood || undefined,
        firstAuthor: firstAuthor || undefined,
      });
      // Show success briefly, then close
      setSaveStatus("success");
      setTimeout(() => {
        onClose();
        // Reset after close animation completes
        setTimeout(() => setSaveStatus("idle"), 300);
      }, 700);
    } catch {
      setSaveStatus("error");
      // Keep editor open — content is already in clipboard
    } finally {
      setSaving(false);
    }
  };

  // Reset saveStatus when editor opens/closes
  useEffect(() => {
    if (open) setSaveStatus("idle");
  }, [open]);

  // Theme tokens
  const overlayBg = isDark ? "bg-black/80" : "bg-[#3D3533]/40";
  const modalBg = isDark ? "bg-[#0f0f0f] border-white/[0.08]" : "bg-[#FCFAF7] border-[#3D3533]/10";
  const hBorder = isDark ? "border-white/[0.06]" : "border-[#3D3533]/06";
  const inputC = isDark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/15 focus:border-white/25" : "bg-[#3D3533]/[0.02] border-[#3D3533]/10 text-[#3D3533]/75 placeholder:text-[#3D3533]/18 focus:border-[#3D3533]/25";
  const labelC = isDark ? "text-white/30" : "text-[#3D3533]/40";
  const sBorder = isDark ? "border-white/[0.05]" : "border-[#3D3533]/06";
  const btnC = isDark ? "bg-white text-black hover:bg-white/90 disabled:bg-white/[0.05] disabled:text-white/15 font-medium" : "bg-[#3D3533] text-[#FCFAF7] hover:bg-[#3D3533]/90 disabled:bg-[#3D3533]/[0.05] disabled:text-[#3D3533]/15 font-medium";
  const cancelC = isDark ? "text-white/25 hover:text-white/45" : "text-[#3D3533]/30 hover:text-[#3D3533]/50";
  const prevBg = isDark ? "bg-[#080808]" : "bg-[#F7F3ED]";
  const tabActive = isDark ? "bg-white/[0.06] text-white/80 border-b-2 border-amber-400/50" : "bg-white/70 text-[#3D3533] border-b-2 border-[#C97D6B]/60";
  const tabInactive = isDark ? "text-white/20 hover:text-white/40" : "text-[#3D3533]/25 hover:text-[#3D3533]/50";

  // Defer Markdown preview rendering so typing doesn't re-render the full
  // rendered HTML synchronously on every keystroke (a diary can get long).
  const deferredAuthor1 = useDeferredValue(contentAuthor1);
  const deferredAuthor2 = useDeferredValue(contentAuthor2);
  const deferredPreview = useDeferredValue(activeTab === "author1" ? contentAuthor1 : contentAuthor2);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 ${overlayBg}`}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}
          className={`rounded-2xl border w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl ${modalBg}`}>

          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-3 border-b shrink-0 ${hBorder}`}>
            <h2 className={`text-sm tracking-wider font-light ${isDark ? "text-white/70" : "text-[#3D3533]/75"}`}>
              {editingEvent ? "编辑条目" : "新建条目"}
            </h2>
            <button onClick={onClose} className={`text-xs tracking-wider transition-colors ${cancelC}`}>关闭 ✕</button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT: Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Title + Meta */}
              <div className="flex gap-4 flex-wrap items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className={`text-[11px] tracking-widest uppercase block mb-1 ${labelC}`}>标题 *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    className={`w-full border-b px-0 py-2 text-sm outline-none transition-colors ${inputC}`} placeholder="给这段回忆取个名字…" />
                </div>
                <div>
                  <label className={`text-[11px] tracking-widest uppercase block mb-1 ${labelC}`}>日期</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className={`border-b px-0 py-2 text-sm outline-none transition-colors ${inputC}`} />
                </div>
                <div>
                  <label className={`text-[11px] tracking-widest uppercase block mb-1 ${labelC}`}>心情</label>
                  <div className="flex gap-0.5 flex-wrap max-w-[180px]">
                    {MOODS.map(m => (
                      <button key={m} onClick={() => setMood(mood === m ? "" : m)}
                        className={`text-xs w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-white/[0.06] ${mood === m ? "ring-1 ring-white/20" : ""}`}>{m}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* First author — who created/started this diary entry, locks left position */}
              {editingEvent && (
                <div>
                  <label className={`text-[11px] tracking-widest uppercase block mb-1 ${labelC}`}>主作者（谁在左边）</label>
                  <div className="flex gap-2">
                    {(["author1", "author2"] as const).map(a => (
                      <button key={a} onClick={() => setFirstAuthor(firstAuthor === a ? "" : a)}
                        className={`text-[11px] tracking-wider px-3 py-1 rounded-full border transition-colors ${
                          firstAuthor === a
                            ? (isDark ? "border-amber-400/50 text-amber-300 bg-amber-400/[0.08]" : "border-[#C97D6B]/50 text-[#C97D6B] bg-[#C97D6B]/[0.08]")
                            : (isDark ? "border-white/[0.08] text-white/25 hover:text-white/50" : "border-[#3D3533]/08 text-[#3D3533]/30 hover:text-[#3D3533]/50")
                        }`}>{AUTHORS[a].emoji} {authorLabel(a)}</button>
                    ))}
                  </div>
                  <p className={`text-[9px] mt-1 tracking-wider ${isDark ? "text-white/15" : "text-[#3D3533]/20"}`}>
                    设定后永久生效，后来编辑者在右边
                  </p>
                </div>
              )}

              {/* Summary */}
              <div>
                <label className={`text-[11px] tracking-widest uppercase block mb-1 ${labelC}`}>摘要</label>
                <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={1}
                  className={`w-full border rounded px-3 py-2 text-sm outline-none resize-none transition-colors ${inputC}`} placeholder="一句话概括…" />
              </div>

              {/* ---- 📝 Diary (Dual author tabs) ---- */}
              <div className={`pt-3 border-t ${sBorder}`}>
                <label className={`text-[11px] tracking-widest uppercase block mb-2 ${labelC}`}>📝 日记正文 (Markdown)</label>
                {/* Author tabs */}
                <div className="flex mb-3">
                  {(["author1", "author2"] as AuthorTab[]).map(a => {
                    const hasContent = a === "author1" ? !!contentAuthor1 : !!contentAuthor2;
                    return (
                      <button key={a} onClick={() => setActiveTab(a)}
                        className={`px-4 py-1.5 text-[12px] tracking-wider transition-all ${activeTab === a ? tabActive : tabInactive} relative`}>
                        {authorLabel(a)}
                        {hasContent && <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-400/60" />}
                      </button>
                    );
                  })}
                </div>
                {/* Markdown textarea + preview */}
                <div className="flex gap-3" style={{ minHeight: 180 }}>
                  <textarea
                    value={activeTab === "author1" ? contentAuthor1 : contentAuthor2}
                    onChange={e => activeTab === "author1" ? setContentAuthor1(e.target.value) : setContentAuthor2(e.target.value)}
                    className={`flex-1 border rounded px-3 py-3 text-sm outline-none resize-none font-light leading-relaxed transition-colors ${inputC}`}
                    placeholder={`${authorLabel(activeTab)}的日记…

支持 Markdown：**粗体** *斜体* # 标题 - 列表`}
                  />
                  <div className={`hidden lg:block flex-1 border rounded p-4 overflow-y-auto ${sBorder} ${prevBg}`}>
                    <p className={`text-[11px] tracking-widest mb-2 ${labelC}`}>预览</p>
                    {deferredPreview ? (
                      <div className={`text-xs leading-relaxed tracking-wide prose-museum ${isDark ? "text-white/60" : "text-[#3D3533]/65"}`}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(deferredPreview) }} />
                    ) : (
                      <p className={`text-[11px] italic ${isDark ? "text-white/10" : "text-[#3D3533]/14"}`}>预览…</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ---- 📷 Photos ---- */}
              <div className={`pt-3 border-t ${sBorder}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] tracking-widest uppercase ${labelC}`}>📷 照片 ({photos.length})</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setPickSelected(new Set()); setPhotoPickOpen(true); }}
                      className={`px-3 py-2 rounded border text-[11px] tracking-wider cursor-pointer transition-all ${isDark ? "border-white/10 hover:border-white/20 text-white/30 hover:text-white/50" : "border-[#3D3533]/15 hover:border-[#3D3533]/30 text-[#3D3533]/35 hover:text-[#3D3533]/60"}`}>
                      + 从照片墙选
                    </button>
                    <label className={`px-3 py-2 rounded border text-[11px] tracking-wider cursor-pointer transition-all ${isDark ? "border-dashed border-white/10 hover:border-white/20 text-white/30 hover:text-white/50" : "border-dashed border-[#3D3533]/15 hover:border-[#3D3533]/30 text-[#3D3533]/35 hover:text-[#3D3533]/60"}`}>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                      {uploading ? "上传中…" : "+ 本地上传"}
                    </label>
                  </div>
                </div>
                {photos.length === 0 ? (
                  <div className={`border border-dashed rounded-lg flex items-center justify-center py-12 ${isDark ? "border-white/[0.05] text-white/10" : "border-[#3D3533]/08 text-[#3D3533]/14"}`}>
                    <div className="text-center">
                      <span className="text-3xl block mb-2 opacity-30">📸</span>
                      <p className="text-[11px] tracking-wider">点击"+ 添加照片"从本地上传</p>
                    </div>
                  </div>
                ) : (
                  <SortablePhotoGrid
                    items={photos}
                    onReorder={(ordered) => {
                      setPhotos(ordered);
                      // Persist new order to the server
                      const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
                      fetch("/api/photos/reorder", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
                        credentials: "include",
                        body: JSON.stringify({ orderedIds: ordered.map(p => p.id) }),
                      }).catch(() => {});
                    }}
                    containerClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                    renderItem={(p, _i) => (
                      <div className={`border rounded-lg overflow-hidden group ${sBorder}`}>
                        <div className="aspect-square bg-[#0a0a0a] flex items-center justify-center relative">
                          {p.src.startsWith("/api/uploads/") ? (
                            <img src={thumb(p.src, 320)} alt={p.caption} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl opacity-30">{p.src}</span>
                          )}
                          <button onClick={() => removePhoto(p.id)}
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-[11px] text-white/50 hover:text-red-400 hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100">✕</button>
                        </div>
                        <input value={p.caption} onChange={e => updatePhotoCaption(p.id, e.target.value)}
                          className={`w-full text-[11px] px-2 py-1.5 outline-none border-0 bg-transparent transition-colors ${inputC}`} placeholder="添加说明…" />
                      </div>
                    )}
                  />
                )}
              </div>
            </div>

            {/* RIGHT: Preview panel */}
            <div className={`hidden xl:block w-[280px] shrink-0 border-l overflow-y-auto p-5 space-y-4 ${sBorder} ${prevBg}`}>
              <p className={`text-[11px] tracking-widest uppercase ${labelC}`}>预览</p>
              {title && (
                <div className={`pb-3 border-b ${sBorder}`}>
                  <h3 className="text-sm font-medium leading-snug tracking-wide">{title}</h3>
                  <p className={`text-[11px] mt-1 ${isDark ? "text-white/20" : "text-[#3D3533]/30"}`}>{date} {mood}</p>
                </div>
              )}
              {/* Author1 preview */}
              {contentAuthor1 && (
                <div>
                  <p className={`text-[8px] tracking-widest uppercase ${labelC}`}>{authorLabel("author1")}</p>
                  <div className={`text-[12px] leading-relaxed prose-museum mt-1 ${isDark ? "text-white/55" : "text-[#3D3533]/60"}`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(deferredAuthor1) }} />
                </div>
              )}
              {/* Author2 preview */}
              {contentAuthor2 && (
                <div className={`pt-2 border-t ${sBorder}`}>
                  <p className={`text-[8px] tracking-widest uppercase ${labelC}`}>{authorLabel("author2")}</p>
                  <div className={`text-[12px] leading-relaxed prose-museum mt-1 ${isDark ? "text-white/55" : "text-[#3D3533]/60"}`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(deferredAuthor2) }} />
                </div>
              )}
              {photos.length > 0 && <p className={`text-[11px] tracking-widest ${labelC}`}>📷 {photos.length} 张照片</p>}
            </div>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between px-6 py-3 border-t shrink-0 ${hBorder}`}>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className={`text-xs tracking-wider transition-colors ${cancelC}`}>
                {saveStatus === "success" ? "关闭" : "取消"}
              </button>
              {saveStatus === "error" && (
                <span className={`text-[11px] tracking-wider ${isDark ? "text-amber-400/70" : "text-amber-600/80"}`}>
                  ⚠ 保存失败，内容已复制到剪切板
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saveStatus === "success"}
              className={`text-xs tracking-wider px-6 py-2 rounded transition-all min-w-[80px] ${
                saveStatus === "success"
                  ? (isDark ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-50 text-emerald-600")
                  : saveStatus === "error"
                    ? (isDark ? "bg-amber-400/10 text-amber-300 hover:bg-amber-400/20" : "bg-amber-50 text-amber-600 hover:bg-amber-100")
                    : btnC
              }`}
            >
              {saveStatus === "saving" ? "保存中…" : saveStatus === "success" ? "✓ 已保存" : saveStatus === "error" ? "重试保存" : editingEvent ? "保存修改" : "创建条目"}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Photo picker — date-grouped side panel from right */}
      <AnimatePresence>
        {photoPickOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setPhotoPickOpen(false)}>
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`w-full md:w-[520px] h-full flex flex-col shadow-2xl ${isDark ? "bg-[#0e0e0e] border-l border-white/[0.06]" : "bg-[#FBF7F2] border-l border-[#3D3533]/06"}`}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 shrink-0 border-b ${isDark ? "border-white/[0.06]" : "border-[#3D3533]/06"}`}>
                <div>
                  <p className={`text-sm tracking-wider ${isDark ? "text-white/80" : "text-[#3D3533]/80"}`}>从照片墙选择</p>
                  <p className={`text-[11px] mt-0.5 tracking-wider ${isDark ? "text-white/25" : "text-[#3D3533]/35"}`}>
                    已选 {pickSelected.size} 张 · 共 {pickablePhotos.length} 张可选
                  </p>
                </div>
                <button onClick={() => setPhotoPickOpen(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? "text-white/30 hover:text-white/60 hover:bg-white/[0.06]" : "text-[#3D3533]/40 hover:text-[#3D3533]/70 hover:bg-[#3D3533]/[0.04]"}`}>
                  ✕
                </button>
              </div>

              {/* Date-grouped photo grid */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {pickablePhotos.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className={`text-[11px] tracking-wider ${isDark ? "text-white/15" : "text-[#3D3533]/25"}`}>没有可选择的照片</p>
                  </div>
                ) : (() => {
                  // Sort by date descending, and group by date
                  const sorted = [...pickablePhotos].sort((a, b) => b.date.localeCompare(a.date));
                  const groups = new Map<string, typeof sorted>();
                  for (const p of sorted) {
                    const d = p.date || "未知日期";
                    if (!groups.has(d)) groups.set(d, []);
                    groups.get(d)!.push(p);
                  }
                  return (
                    <div className="space-y-8">
                      {[...groups.entries()].map(([dateStr, items]) => (
                        <section key={dateStr}>
                          <h3 className={`text-sm font-light tracking-wider mb-3 pb-1.5 border-b ${isDark ? "text-white/40 border-white/[0.04]" : "text-[#3D3533]/50 border-[#3D3533]/04"}`}>
                            {dateStr} <span className={`text-[11px] ml-1 ${isDark ? "text-white/15" : "text-[#3D3533]/20"}`}>{items.length} 张</span>
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            {items.map(p => {
                              const sel = pickSelected.has(p.id);
                              return (
                                <button key={p.id}
                                  onClick={() => {
                                    const next = new Set(pickSelected);
                                    sel ? next.delete(p.id) : next.add(p.id);
                                    setPickSelected(next);
                                  }}
                                  className={`text-left rounded-lg overflow-hidden border-2 transition-all group ${
                                    sel
                                      ? (isDark ? "border-emerald-400/60 bg-emerald-400/[0.04]" : "border-emerald-600/60 bg-emerald-50")
                                      : (isDark ? "border-transparent hover:border-white/[0.08]" : "border-transparent hover:border-[#3D3533]/08")
                                  }`}>
                                  <div className="aspect-[4/3] bg-[#0a0a0a] flex items-center justify-center relative">
                                    {p.src.startsWith("/api/uploads/") || p.src.startsWith("http") ? (
                                      <img src={thumb(p.src, 320)} alt={p.caption} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-2xl opacity-20">✦</span>
                                    )}
                                    {sel && (
                                      <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${isDark ? "bg-emerald-400 text-black" : "bg-emerald-600 text-white"}`}>
                                        ✓
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <div className={`px-2.5 py-2 ${sel ? (isDark ? "bg-emerald-400/[0.06]" : "bg-emerald-50") : ""}`}>
                                    <p className={`text-[11px] truncate font-medium tracking-wide ${isDark ? "text-white/70" : "text-[#3D3533]/70"}`}>
                                      {p.caption || "无标题"}
                                    </p>
                                    <p className={`text-[10px] mt-0.5 tracking-wider ${isDark ? "text-white/25" : "text-[#3D3533]/35"}`}>
                                      {p.date}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-between px-5 py-4 shrink-0 border-t gap-3 ${isDark ? "border-white/[0.06]" : "border-[#3D3533]/06"}`}>
                <button onClick={() => { setPickSelected(new Set()); setPhotoPickOpen(false); }}
                  className={`text-[11px] tracking-wider px-4 py-2 rounded-full transition-colors ${isDark ? "text-white/25 hover:text-white/45" : "text-[#3D3533]/30 hover:text-[#3D3533]/50"}`}>
                  取消
                </button>
                <button onClick={() => {
                  const selected = pickablePhotos.filter(p => pickSelected.has(p.id));
                  const newPhotos: EntryPhoto[] = selected.map(p => ({ id: p.id, caption: p.caption, date: p.date, src: p.src, width: p.width, height: p.height }));
                  setPhotos(prev => [...prev, ...newPhotos.filter(np => !prev.some(ep => ep.id === np.id))]);
                  setPhotoPickOpen(false);
                }}
                  disabled={pickSelected.size === 0}
                  className={`text-[12px] tracking-wider px-6 py-2 rounded-full font-medium transition-all ${
                    pickSelected.size > 0
                      ? (isDark ? "bg-white text-black hover:bg-white/90 hover:shadow-lg hover:shadow-white/10" : "bg-[#3D3533] text-white hover:bg-[#3D3533]/90 hover:shadow-lg hover:shadow-[#3D3533]/10")
                      : (isDark ? "bg-white/[0.05] text-white/15 cursor-not-allowed" : "bg-[#3D3533]/[0.05] text-[#3D3533]/15 cursor-not-allowed")
                  }`}>
                  添加 {pickSelected.size > 0 ? `${pickSelected.size} 张照片` : "选中照片"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
