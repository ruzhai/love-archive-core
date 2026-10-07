"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, formatDateShort } from "@/lib/data";
import type { LoveEntry, EntryPhoto, EventSortMode, StandalonePhoto, GalleryImage } from "@/lib/types";
import { eventSortLabels } from "@/lib/types";
import { AUTHORS, authorLabel } from "@/lib/config";
import { useEventLibrary } from "@/hooks/useEventLibrary";
import { usePhotoLibrary } from "@/hooks/usePhotoLibrary";
import { useTheme } from "@/hooks/useTheme";
import { renderMarkdown } from "@/lib/markdown";
import EventEditor from "@/components/EventEditor";
import { useAuth } from "@/lib/auth/auth-context";
import MuseumPhotoCard from "@/components/MuseumPhotoCard";
import SortablePhotoGrid from "@/components/SortablePhotoGrid";
import PhotoLightbox from "@/components/PhotoLightbox";

export default function DiaryContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const searchParams = useSearchParams();

  const { isAdmin, user } = useAuth();

  const {
    events,
    sortMode,
    setSortMode,
    addEvent,
    updateEvent,
    deleteEvent,
    initialized,
  } = useEventLibrary();
  const { photos: libraryPhotos, linkPhotoToEntry, linkPhotosToEntry, updatePhoto } = usePhotoLibrary();

  const [selectedEventId, setSelectedEventId] = useState<string>("");

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LoveEntry | null>(null);
  const [diaryLightboxId, setDiaryLightboxId] = useState<string | null>(null);

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  // Set initial selected entry (from URL param or the first one)
  useEffect(() => {
    if (!initialized || events.length === 0) return;
    const urlEntryId = searchParams.get("entry");
    if (urlEntryId && events.find(e => e.id === urlEntryId)) {
      setSelectedEventId(urlEntryId);
    } else if (!selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [initialized, events, selectedEventId, searchParams]);

  // If navigated in with ?edit=1 (e.g. from the photo wall's "写当天日记"),
  // auto-open the editor for that entry once it has loaded.
  const editParamHandled = useRef(false);
  useEffect(() => {
    if (!initialized || events.length === 0 || editParamHandled.current) return;
    if (searchParams.get("edit") !== "1") return;
    const urlEntryId = searchParams.get("entry");
    const target = urlEntryId ? events.find((e) => e.id === urlEntryId) : null;
    if (target) {
      editParamHandled.current = true;
      setSelectedEventId(target.id);
      setEditingEvent(target);
      setEditorOpen(true);
    }
  }, [initialized, events, searchParams]);

  // Scroll back to the top when switching entries
  useEffect(() => {
    if (messageAreaRef.current) messageAreaRef.current.scrollTop = 0;
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // 条目照片从「照片库」解析（photoIds 优先，其次 entryId 关联）。
  // 因为 entry.photos 不会存到服务器（只存 photoIds），刷新后 selectedEvent.photos 为空，
  // 必须从服务器同步过来的照片库里重建，才能跨刷新/跨设备显示。
  const entryPhotos = useMemo<StandalonePhoto[]>(() => {
    if (!selectedEvent) return [];
    const map = new Map<string, StandalonePhoto>();
    for (const id of selectedEvent.photoIds || []) {
      const p = libraryPhotos.find((lp) => lp.id === id);
      if (p) map.set(p.id, p);
    }
    for (const p of libraryPhotos) {
      if (p.entryId === selectedEvent.id && !map.has(p.id)) map.set(p.id, p);
    }
    return Array.from(map.values());
  }, [selectedEvent, libraryPhotos]);

  // Build GalleryImage[] for PhotoLightbox in diary view
  const diaryGalleryImages = useMemo<GalleryImage[]>(() => {
    return entryPhotos.map(p => ({
      id: p.id, src: p.src, caption: p.caption || "", date: p.date || selectedEvent?.date || "",
      width: p.width || 800, height: p.height || 600,
      sortOrder: (p as any).sortOrder ?? 0, rotation: (p as any).rotation ?? 0,
      _entryId: selectedEvent?.id,
      _entryTitle: selectedEvent?.title,
    }));
  }, [entryPhotos, selectedEvent]);
  const diaryLightboxIndex = diaryLightboxId ? diaryGalleryImages.findIndex(img => img.id === diaryLightboxId) : -1;

  // Group entries by month for sidebar
  const groupedEvents = useMemo(() => {
    const groups: { month: string; events: LoveEntry[] }[] = [];
    for (const e of events) {
      const month = e.date.slice(0, 7);
      let group = groups[groups.length - 1];
      if (!group || group.month !== month) {
        group = { month, events: [] };
        groups.push(group);
      }
      group.events.push(e);
    }
    return groups;
  }, [events]);

  const monthLabel = (month: string) => {
    const [y, m] = month.split("-");
    return `${parseInt(y)}年${parseInt(m)}月`;
  };

  // Handle save from editor
  const handleSaveEvent = async (data: {
    title: string; summary: string; date: string;
    content_author1: string; content_author2: string;
    photos: EntryPhoto[]; photoIds?: string[];
    mood?: string; firstAuthor?: string;
  }) => {
    const firstAuthor = data.firstAuthor
      || (data.content_author1.trim() && !data.content_author2.trim() ? "author1" : undefined)
      || (data.content_author2.trim() && !data.content_author1.trim() ? "author2" : undefined);
    const photoIds = data.photoIds || data.photos.map(p => p.id);

    if (editingEvent) {
      const finalFirstAuthor = editingEvent.firstAuthor || firstAuthor;
      // Only `photos` is client-only — the server stores `photoIds` instead.
      const { photos: _p, ...cleanData } = data as any;
      await updateEvent(editingEvent.id, { ...cleanData, firstAuthor: finalFirstAuthor, photoIds });
      // Link photos to entry via ONE bulk request (was Promise.all of N
      // single-PATCHes — a diary with many photos fired N requests + N saveDb).
      if (photoIds.length > 0) {
        try {
          await linkPhotosToEntry(photoIds, editingEvent.id);
        } catch { /* entry linking is best-effort */ }
      }
    } else {
      const { photos: _p, ...cleanData } = data as any;
      const newEvent = await addEvent({ ...cleanData, firstAuthor, photoIds } as any);
      if (newEvent) {
        if (photoIds.length > 0) {
          try {
            await linkPhotosToEntry(photoIds, newEvent.id);
          } catch { /* best-effort */ }
        }
        setSelectedEventId(newEvent.id);
      } else {
        throw new Error("创建条目失败 — newEvent 为空");
      }
    }
  };

  // Open editor for new entry
  const handleAddEvent = () => {
    setEditingEvent(null);
    setEditorOpen(true);
  };

  // Open editor for editing — resolve photoIds → photos BEFORE opening,
  // so the editor always sees the correct photo list regardless of timing.
  const handleEditEvent = (event: LoveEntry) => {
    const photoIds = event.photoIds || [];
    const resolvedPhotos = photoIds
      .map(pid => libraryPhotos.find(p => p.id === pid))
      .filter(Boolean)
      .map(p => ({ id: p!.id, caption: p!.caption, date: p!.date, src: p!.src, width: p!.width, height: p!.height }));
    setEditingEvent({ ...event, photos: resolvedPhotos });
    setEditorOpen(true);
  };

  // Delete with confirmation
  const handleDeleteEvent = (event: LoveEntry) => {
    if (window.confirm(`删除条目「${event.title}」？此操作不可恢复。`)) {
      deleteEvent(event.id).catch(() => {});
      if (selectedEventId === event.id) {
        setSelectedEventId(events.find((e) => e.id !== event.id)?.id || "");
      }
    }
  };

  // ========== Theme-aware styles ==========
  // Structural elements use CSS variables (instant theme switch)
  // Detailed elements use JS conditionals (React re-render after toggle)
  const sidebarItemActive = isDark ? "bg-white/[0.06] text-chat-sidebar-item-active-text border-l-2 border-white/20" : "bg-white/70 text-[#3D3533] border-l-2 border-[#C97D6B]/60";
  const sidebarItemInactive = isDark ? "text-chat-sidebar-item-text hover:bg-white/[0.02] hover:text-white/50 border-l-2 border-transparent" : "text-[#3D3533]/40 hover:bg-white/40 hover:text-[#3D3533]/60 border-l-2 border-transparent";
  const headingColor = isDark ? "text-white" : "text-[#3D3533]";
  const subheadingColor = isDark ? "text-white/30" : "text-[#3D3533]/45";
  const eventTitleColor = isDark ? "text-white/80" : "text-[#3D3533]/85";
  const eventMetaColor = isDark ? "text-white/25" : "text-[#3D3533]/35";
  const emptyTextColor = isDark ? "text-white/15" : "text-[#3D3533]/25";
  const paginationText = isDark ? "text-white/10" : "text-[#3D3533]/18";
  const navBtnColor = isDark ? "text-white/20 hover:text-white/50 disabled:opacity-10" : "text-[#3D3533]/30 hover:text-[#3D3533]/60 disabled:opacity-10";
  const sortBtnColor = isDark ? "text-white/20 hover:text-white/40" : "text-[#3D3533]/30 hover:text-[#3D3533]/55";
  const sortMenuBg = isDark ? "bg-[#141414] border-white/[0.08]" : "bg-white border-[#3D3533]/08 shadow-lg";
  const sortItemActive = isDark ? "text-white/70 bg-white/[0.06]" : "text-[#3D3533]/80 bg-[#3D3533]/05";
  const sortItemInactive = isDark ? "text-white/25 hover:text-white/45 hover:bg-white/[0.02]" : "text-[#3D3533]/35 hover:text-[#3D3533]/55 hover:bg-[#3D3533]/03";
  const monthLabelColor = isDark ? "text-white/12" : "text-[#3D3533]/20";

  return (
    <div className="min-h-screen pt-16 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-16 z-30 backdrop-blur-xl border-b bg-chat-topbar-bg border-chat-topbar-border">
        <div className="flex items-center justify-between px-6 h-12 max-w-full">
          <div className="flex items-center gap-3">
            {/* Sort toggle */}
            <div className="relative">
              <button
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                className={`text-[11px] ${sortBtnColor} transition-colors tracking-wider flex items-center gap-1`}
              >
                排序: {eventSortLabels[sortMode]}
                <span className="text-[8px]">▼</span>
              </button>
              {sortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                  <div className={`absolute top-full left-0 mt-1 z-20 rounded-md py-1 min-w-[130px] ${sortMenuBg}`}>
                    {(Object.entries(eventSortLabels) as [EventSortMode, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setSortMode(key); setSortMenuOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] tracking-wider transition-colors ${
                          sortMode === key ? sortItemActive : sortItemInactive
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Add entry */}
            {isAdmin && (
              <button
                onClick={handleAddEvent}
                className={`text-[11px] ${sortBtnColor} transition-colors tracking-wider flex items-center gap-1`}
              >
                <span className="text-sm leading-none">+</span> 新建条目
              </button>
            )}
          </div>

          {/* Sidebar toggle (mobile) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`lg:hidden text-[11px] tracking-wider transition-colors ${isDark ? "text-white/30 hover:text-white/60" : "text-[#3D3533]/40 hover:text-[#3D3533]/65"}`}
          >
            {sidebarCollapsed ? "展开索引" : "收起索引"}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* ==================== SIDEBAR ==================== */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 272, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden lg:block shrink-0 border-r overflow-y-auto bg-chat-sidebar-bg border-chat-sidebar-border"
              style={{ height: "calc(100vh - 7rem)" }}
            >
              <div className="py-3">
                {events.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className={`text-[11px] tracking-wider ${emptyTextColor}`}>暂无条目</p>
                    <p className={`text-[11px] mt-1 ${emptyTextColor}`}>点击上方「+ 新建条目」</p>
                  </div>
                ) : (
                  groupedEvents.map((group) => (
                    <div key={group.month} className="mb-1">
                      <p className={`px-4 py-2 text-[11px] tracking-widest uppercase ${monthLabelColor}`}>
                        {monthLabel(group.month)}
                      </p>
                      {group.events.map((event) => {
                        const isSelected = event.id === selectedEventId;
                        return (
                          <div key={event.id} className="relative group/evt">
                            <button
                              onClick={() => setSelectedEventId(event.id)}
                              className={`w-full text-left px-4 py-2.5 pr-12 transition-colors duration-200 ${
                                isSelected ? sidebarItemActive : sidebarItemInactive
                              }`}
                            >
                              <p className="text-[11px] tracking-wider leading-tight line-clamp-2">
                                {event.title}
                              </p>
                              <p className="text-[11px] opacity-25 mt-0.5 tracking-wider">
                                {formatDateShort(event.date)}
                              </p>
                            </button>

                            {/* Edit/delete — always in the layout, revealed on hover */}
                            {isAdmin && (
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                <div className="opacity-0 group-hover/evt:opacity-100 transition-opacity flex items-center gap-0.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                                    className={`p-1 text-[11px] transition-colors ${isDark ? "text-white/20 hover:text-white/50" : "text-[#3D3533]/25 hover:text-[#3D3533]/55"}`}
                                    title="编辑"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event); }}
                                    className={`p-1 text-[11px] transition-colors ${isDark ? "text-white/15 hover:text-red-400/60" : "text-[#3D3533]/20 hover:text-red-500/60"}`}
                                    title="删除"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile drawer */}
        {!sidebarCollapsed && (
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t max-h-[40vh] overflow-y-auto bg-chat-sidebar-bg border-chat-topbar-border">
            <div className="p-3 space-y-1">
              {events.map((event) => {
                const isSelected = event.id === selectedEventId;
                return (
                  <button
                    key={event.id}
                    onClick={() => { setSelectedEventId(event.id); setSidebarCollapsed(true); }}
                    className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-3 ${
                      isSelected
                        ? (isDark ? "bg-white/[0.08] text-white/70" : "bg-white/70 text-[#3D3533]")
                        : (isDark ? "text-white/25 hover:bg-white/[0.03]" : "text-[#3D3533]/35 hover:bg-white/40")
                    }`}
                  >
                    <span className="text-[11px] opacity-40 shrink-0 w-10">{formatDateShort(event.date)}</span>
                    <span className="text-[12px] tracking-wider truncate">{event.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== CONTENT AREA ==================== */}
        <div
          ref={messageAreaRef}
          className="flex-1 overflow-y-auto"
          style={{ height: "calc(100vh - 7rem)" }}
        >
          <div className="max-w-6xl mx-auto px-4 py-12">
            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-16"
            >
              <p className={`text-[11px] tracking-[0.3em] uppercase mb-4 ${isDark ? "text-white/25" : "text-[#3D3533]/35"}`}>
                Diary
              </p>
              <h1 className={`text-5xl md:text-7xl font-bold tracking-[-0.02em] mb-4 ${headingColor}`}>
                日记
              </h1>
              <p className={`text-sm max-w-md leading-relaxed tracking-wider font-light ${subheadingColor}`}>
                一天一天写下来，日子就有了形状。
              </p>
            </motion.div>

            {!selectedEvent ? (
              <div className="flex items-center justify-center py-32">
                <div className="text-center">
                  <p className={`text-xs tracking-wider mb-4 ${emptyTextColor}`}>
                    {events.length === 0 ? "还没有日记" : "从左侧选择一篇"}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={handleAddEvent}
                      className={`text-[11px] ${sortBtnColor} transition-colors tracking-wider`}
                    >
                      + 写下第一篇
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <motion.div
                key={selectedEvent.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                {/* Entry header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-white/20" : "bg-[#C97D6B]/40"}`} />
                    <h2 className={`text-lg font-light tracking-wide ${eventTitleColor}`}>
                      {selectedEvent.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 ml-[18px] flex-wrap">
                    <p className={`text-[11px] tracking-wider ${eventMetaColor}`}>
                      {formatDate(selectedEvent.date)}
                    </p>
                    {(selectedEvent.content_author1 || selectedEvent.content_author2) && (
                      <>
                        <span className={isDark ? "text-white/10" : "text-[#3D3533]/12"}>·</span>
                        <p className={`text-[11px] tracking-wider ${eventMetaColor}`}>
                          {[
                            selectedEvent.content_author1 && authorLabel("author1"),
                            selectedEvent.content_author2 && authorLabel("author2"),
                          ].filter(Boolean).join(" & ")}
                        </p>
                      </>
                    )}
                    {selectedEvent.mood && (
                      <>
                        <span className={isDark ? "text-white/10" : "text-[#3D3533]/12"}>·</span>
                        <span className="text-sm">{selectedEvent.mood}</span>
                      </>
                    )}
                  </div>
                  {selectedEvent.summary && (
                    <p className={`text-xs mt-3 ml-[18px] leading-relaxed tracking-wider ${subheadingColor}`}>
                      {selectedEvent.summary}
                    </p>
                  )}

                  {/* Edit/Delete actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-4 mt-4 ml-[18px]">
                      <button
                        onClick={() => handleEditEvent(selectedEvent)}
                        className={`text-[11px] transition-colors tracking-wider ${isDark ? "text-white/20 hover:text-white/40" : "text-[#3D3533]/25 hover:text-[#3D3533]/50"}`}
                      >
                        ✎ 编辑
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(selectedEvent)}
                        className={`text-[11px] transition-colors tracking-wider ${isDark ? "text-white/15 hover:text-red-400/50" : "text-[#3D3533]/20 hover:text-red-500/55"}`}
                      >
                        ✕ 删除
                      </button>
                    </div>
                  )}
                </div>

                {/* ---- 📝 Diary (two authors, side by side) ---- */}
                {(selectedEvent.content_author1 || selectedEvent.content_author2) && (() => {
                  // Who wrote first → their content goes on the left.
                  // If only one author has written, they're the primary.
                  // If both have written, the logged-in user first, else default author1.
                  const loggedUser = (user as any)?.authorKey ?? user?.username;
                  // 谁先创建日记谁在左边 —— firstAuthor 在首次保存时自动设置，
                  // 之后永不改变。后来的编辑者永远在右边。
                  // 尚未设置 firstAuthor 的旧条目：按内容推断（只有一个写了就那人优先）
                  const primaryFirst = (() => {
                    if (selectedEvent.firstAuthor) return selectedEvent.firstAuthor;
                    if (selectedEvent.content_author2 && !selectedEvent.content_author1) return "author2";
                    if (selectedEvent.content_author1 && !selectedEvent.content_author2) return "author1";
                    return loggedUser === "author2" ? "author2" : "author1";
                  })();
                  const authors = [
                    { key: "author1" as const, label: authorLabel("author1"), content: selectedEvent.content_author1,
                      accent: isDark ? "border-amber-400/30" : "border-[#C97D6B]/50" },
                    { key: "author2" as const, label: authorLabel("author2"), content: selectedEvent.content_author2,
                      accent: isDark ? "border-rose-400/30" : "border-rose-500/50" },
                  ].filter(a => a.content);
                  // Put the first author on the left
                  authors.sort((a, b) => {
                    if (a.key === primaryFirst) return -1;
                    if (b.key === primaryFirst) return 1;
                    return 0;
                  });

                  const hasBoth = authors.length === 2;
                  return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="mb-8">
                      <div className={`grid ${hasBoth ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} gap-4`}>
                        {authors.map(({ key, label, content, accent }) => (
                          <motion.div key={key}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: key === primaryFirst ? 0 : 0.15 }}
                            className={`card p-5 border-l-2 ${accent} ${
                              isDark
                                ? "backdrop-blur-sm bg-white/[0.02]"
                                : "backdrop-blur-sm bg-white/60"
                            }`}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`w-1.5 h-1.5 rounded-full ${key === "author1" ? "bg-amber-400/60" : "bg-rose-400/60"}`} />
                              <p className={`text-[11px] tracking-widest uppercase ${eventMetaColor}`}>
                                ✎ {AUTHORS[key].emoji} {label}
                              </p>
                            </div>
                            <div className={`text-sm leading-relaxed tracking-wide prose-museum ${
                              isDark ? "text-white/65" : "text-[#3D3533]/70"
                            }`} dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })()}

                {/* ---- 📷 Photos ---- */}
                {entryPhotos.length > 0 && (
                  <div className="mb-8">
                    <p className={`text-[11px] tracking-widest uppercase mb-3 ${eventMetaColor}`}>
                      📷 照片 ({entryPhotos.length})
                    </p>
                    <SortablePhotoGrid
                      items={entryPhotos}
                      disabled={!isAdmin}
                      onReorder={(ordered) => {
                        if (!selectedEvent) return;
                        const newPhotoIds = ordered.map(p => p.id);
                        updateEvent(selectedEvent.id, { photoIds: newPhotoIds }).catch(() => {});
                        // Also update sortOrder in standalone photos
                        const csrf = document.cookie.split("; ").find(r => r.startsWith("csrf_token="))?.split("=")[1] || "";
                        fetch("/api/photos/reorder", {
                          method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
                          credentials: "include", body: JSON.stringify({ orderedIds: newPhotoIds }),
                        }).catch(() => {});
                      }}
                      containerClassName="grid grid-cols-2 sm:grid-cols-3 gap-3"
                      renderItem={(photo, i) => (
                          <MuseumPhotoCard
                            photo={photo}
                            index={i}
                            onClick={() => setDiaryLightboxId(photo.id)}
                          />
                      )}
                    />
                  </div>
                )}

                {/* PhotoLightbox — same component as the photo wall */}
                {diaryLightboxIndex >= 0 && (
                  <PhotoLightbox
                    images={diaryGalleryImages}
                    selectedIndex={diaryLightboxIndex}
                    entries={events}
                    onClose={() => setDiaryLightboxId(null)}
                    onNavigate={(i) => setDiaryLightboxId(diaryGalleryImages[i]?.id ?? null)}
                    onCaptionChange={isAdmin ? (id, cap) => updatePhoto(id, { caption: cap }) : undefined}
                    onDateChange={isAdmin ? (id, date) => updatePhoto(id, { date }) : undefined}
                    onRotate={isAdmin ? (id, rot) => updatePhoto(id, { rotation: rot }) : undefined}
                    onDeletePhoto={isAdmin ? (photoId) => {
                      if (!selectedEvent) return;
                      const newPhotoIds = (selectedEvent.photoIds || []).filter(id => id !== photoId);
                      updateEvent(selectedEvent.id, { photoIds: newPhotoIds }).catch(() => {});
                      linkPhotoToEntry(photoId, null).catch(() => {});
                      setDiaryLightboxId(null);
                    } : undefined}
                  />
                )}

                {/* Empty state */}
                {!selectedEvent.content_author1 && !selectedEvent.content_author2 && entryPhotos.length === 0 && (
                  <p className={`text-[11px] italic py-12 text-center ${emptyTextColor}`}>
                    （此条目暂无内容）
                  </p>
                )}

                {/* Entry navigation */}
                <div className={`flex items-center justify-between mt-8 pt-6 border-t border-chat-divider`}>
                  <button
                    onClick={() => {
                      const idx = events.findIndex((e) => e.id === selectedEventId);
                      if (idx > 0) setSelectedEventId(events[idx - 1].id);
                    }}
                    disabled={events[0]?.id === selectedEventId}
                    className={`text-[11px] transition-colors tracking-wider ${navBtnColor}`}
                  >
                    ← 上一篇
                  </button>
                  <span className={`text-[11px] tracking-widest ${paginationText}`}>
                    {events.findIndex((e) => e.id === selectedEventId) + 1} / {events.length}
                  </span>
                  <button
                    onClick={() => {
                      const idx = events.findIndex((e) => e.id === selectedEventId);
                      if (idx < events.length - 1) setSelectedEventId(events[idx + 1].id);
                    }}
                    disabled={events[events.length - 1]?.id === selectedEventId}
                    className={`text-[11px] transition-colors tracking-wider ${navBtnColor}`}
                  >
                    下一篇 →
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Entry Editor Modal */}
      <EventEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingEvent(null); }}
        onSave={handleSaveEvent}
        editingEvent={editingEvent}
      />
    </div>
  );
}
