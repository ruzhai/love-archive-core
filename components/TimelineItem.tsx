"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { eventTypeLabels } from "@/lib/types";
import type { LoveEntry } from "@/lib/types";
import { formatDate } from "@/lib/data";
import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";

const EVENT_TYPES = Object.entries(eventTypeLabels);
const typeIcons: Record<string, string> = {
  first_chat: "💬", first_video_call: "📹", first_meeting: "☕", first_date: "🌹",
  first_hold_hands: "🤝", first_argue: "🌧", first_makeup: "🌈", official: "💝",
  holiday: "🎄", anniversary: "🥂", special_moment: "✨",
};

export interface TimelineEventData {
  id: string; date: string; title: string; description: string;
  type: string; tags: string[]; image?: string; chatRef?: string; entryId?: string; location?: string;
}

interface TimelineItemProps {
  event: TimelineEventData;
  index: number;
  isAdmin?: boolean;
  entries?: LoveEntry[];
  autoEdit?: boolean;
  onUpdate?: (updates: Record<string, any>) => void;
  onDelete?: () => void;
}

export default function TimelineItem({ event, index, isAdmin, entries = [], autoEdit, onUpdate, onDelete }: TimelineItemProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isLeft = index % 2 === 0;
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(event);
  const [newTag, setNewTag] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // A freshly-created event opens straight into edit mode AND scrolls into view
  // so the admin can fill it in immediately (otherwise a bare "新事件" card at
  // the bottom of the list looks like nothing happened — i.e. "fake").
  useEffect(() => {
    if (autoEdit) {
      setEditing(true);
      setEditData(event);
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit]);

  // Diary entries sorted newest-first for the link picker.
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const linkedEntry = event.entryId ? entries.find(e => e.id === event.entryId) : undefined;

  const save = () => {
    onUpdate?.(editData);
    setEditing(false);
  };

  const dateColor = isDark ? "text-white/30" : "text-[#3D3533]/40";
  const locationColor = isDark ? "text-white/15" : "text-[#3D3533]/22";
  const dotBg = isDark ? "bg-white/20 border-white/10" : "bg-[#C97D6B]/30 border-[#C97D6B]/20";
  const titleColor = isDark ? "text-white" : "text-[#3D3533]";
  const descColor = isDark ? "text-white/35" : "text-[#3D3533]/45";
  const tagColor = isDark ? "text-white/20 border-white/[0.06]" : "text-[#3D3533]/25 border-[#3D3533]/08";
  const dividerColor = isDark ? "border-white/[0.06]" : "border-[#3D3533]/06";
  const linkColor = isDark ? "text-white/30 hover:text-white/60" : "text-[#3D3533]/40 hover:text-[#3D3533]/65";
  const inputClass = isDark ? "bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/15 rounded px-2 py-1 text-sm outline-none" : "bg-[#3D3533]/[0.03] border-[#3D3533]/08 text-[#3D3533]/80 placeholder:text-[#3D3533]/18 rounded px-2 py-1 text-sm outline-none";
  const selectClass = isDark ? "bg-white/[0.04] border-white/[0.08] text-white/70 rounded px-2 py-1 text-xs outline-none" : "bg-[#3D3533]/[0.03] border-[#3D3533]/08 text-[#3D3533]/70 rounded px-2 py-1 text-xs outline-none";

  const handleSave = () => {
    // Send entryId as null (not undefined) when cleared so unlinking persists —
    // JSON.stringify drops undefined keys, which would leave the old link intact.
    onUpdate?.({ ...editData, entryId: editData.entryId ?? null });
    setEditing(false);
  };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !editData.tags.includes(t)) {
      setEditData(prev => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setEditData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, x: isLeft ? -40 : 40, y: 20 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}
      className={`relative flex items-start gap-6 md:gap-12 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"} flex-col`}
    >
      {/* Date (desktop) */}
      <div className={`hidden md:flex flex-col flex-1 pt-1 ${isLeft ? "items-end text-right" : "items-start text-left"}`}>
        {editing ? (
          <input type="date" value={editData.date} onChange={e => setEditData(prev => ({ ...prev, date: e.target.value }))} className={inputClass} />
        ) : (
          <p className={`text-sm tracking-wider font-light ${dateColor}`}>
            {(() => { const d = new Date(event.date); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; })()}
          </p>
        )}
        {editing ? (
          <input value={editData.location || ""} onChange={e => setEditData(prev => ({ ...prev, location: e.target.value }))} placeholder="地点" className={`${inputClass} mt-1 w-32`} />
        ) : (
          event.location && <p className={`text-[11px] mt-1 tracking-wider ${locationColor}`}>{event.location}</p>
        )}
      </div>

      {/* Center dot */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className={`w-3 h-3 rounded-full border-2 z-10 ${dotBg}`} />
      </div>

      {/* Content card */}
      <div className="flex-1 w-full">
        <div className="card p-6 md:p-8 relative group/card">
          {/* Admin controls */}
          {isAdmin && (
            <div className="absolute top-3 right-3 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-1">
              {editing ? (
                <>
                  <button onClick={handleSave} className="text-[10px] px-2 py-1 rounded bg-emerald-400/20 text-emerald-400/80">保存</button>
                  <button onClick={() => { setEditing(false); setEditData(event); }} className={`text-[10px] px-2 py-1 rounded transition-colors ${isDark ? "bg-white/10 text-white/50" : "bg-[#3D3533]/10 text-[#3D3533]/50"}`}>取消</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditing(true); setEditData(event); }} className={`text-[10px] px-2 py-1 rounded transition-colors ${isDark ? "bg-white/[0.06] text-white/40 hover:text-white/70" : "bg-[#3D3533]/[0.06] text-[#3D3533]/40 hover:text-[#3D3533]/70"}`}>✎</button>
                  <button onClick={onDelete} className={`text-[10px] px-2 py-1 rounded transition-colors ${isDark ? "bg-white/[0.06] text-white/30 hover:text-red-400/70" : "bg-[#3D3533]/[0.06] text-[#3D3533]/30 hover:text-red-500/70"}`}>✕</button>
                </>
              )}
            </div>
          )}

          {/* Mobile date */}
          <div className="md:hidden mb-4">
            {editing ? (
              <input type="date" value={editData.date} onChange={e => setEditData(prev => ({ ...prev, date: e.target.value }))} className={inputClass} />
            ) : (
              <>
                <p className={`text-sm tracking-wider font-light ${dateColor}`}>{formatDate(event.date)}</p>
                {event.location && <p className={`text-[11px] mt-0.5 tracking-wider ${locationColor}`}>{event.location}</p>}
              </>
            )}
          </div>

          {/* Type badge — free-text label with presets available via datalist,
              so labels like "第一次吃饭" can be typed in, not just picked. */}
          {editing ? (
            <>
              <input
                list={`tl-type-presets-${event.id}`}
                value={eventTypeLabels[editData.type as keyof typeof eventTypeLabels] || editData.type}
                onChange={e => setEditData(prev => ({ ...prev, type: e.target.value }))}
                placeholder="事件类型（可自定义，如：第一次吃饭）"
                className={`${inputClass} w-full max-w-[240px]`}
              />
              <datalist id={`tl-type-presets-${event.id}`}>
                {EVENT_TYPES.map(([k, v]) => <option key={k} value={v} />)}
              </datalist>
            </>
          ) : (
            <span className="chip-accent text-[11px] tracking-wider">{eventTypeLabels[event.type as keyof typeof eventTypeLabels] || event.type}</span>
          )}

          {/* Title */}
          {editing ? (
            <input value={editData.title} onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))} className={`${inputClass} w-full mt-3 text-lg font-medium`} />
          ) : (
            <h3 className={`text-xl md:text-2xl font-light mt-4 mb-3 tracking-wide ${titleColor}`}>{event.title}</h3>
          )}

          {/* Description */}
          {editing ? (
            <textarea value={editData.description} onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))} rows={3} className={`${inputClass} w-full resize-none`} />
          ) : (
            <p className={`text-sm leading-relaxed tracking-wider ${descColor}`}>{event.description}</p>
          )}

          {/* Tags */}
          {editing ? (
            <div className="mt-4 space-y-2">
              <div className="flex gap-1">
                <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="添加标签…" className={`${inputClass} flex-1 text-[11px]`} />
                <button onClick={addTag} className={`text-[11px] px-2 py-1 rounded transition-colors ${isDark ? "bg-white/[0.06] text-white/40" : "bg-[#3D3533]/[0.06] text-[#3D3533]/40"}`}>+</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {editData.tags.map(t => (
                  <span key={t} className={`text-[11px] tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${tagColor}`}>
                    #{t} <button onClick={() => removeTag(t)} className="text-[9px] opacity-50 hover:opacity-100">✕</button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            event.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5">
                {event.tags.map(tag => (
                  <span key={tag} className={`text-[11px] tracking-wider px-2 py-0.5 rounded border ${tagColor}`}>#{tag}</span>
                ))}
              </div>
            )
          )}

          {/* Linked diary / chat (view mode) */}
          {!editing && (linkedEntry || event.chatRef) && (
            <div className={`mt-5 pt-4 border-t ${dividerColor} flex flex-wrap gap-x-5 gap-y-2`}>
              {linkedEntry && (
                <Link href={`/diary?entry=${linkedEntry.id}`} className={`text-[12px] transition-colors duration-300 tracking-wider ${linkColor}`}>
                  📖 查看关联日记：{linkedEntry.title} →
                </Link>
              )}
              {event.chatRef && (
                <Link href={`/diary#${event.chatRef}`} className={`text-[12px] transition-colors duration-300 tracking-wider ${linkColor}`}>
                  💬 查看相关聊天记录 →
                </Link>
              )}
            </div>
          )}

          {/* Link picker (edit mode) */}
          {editing && (
            <div className={`mt-4 pt-4 border-t ${dividerColor} space-y-1.5`}>
              <label className={`block text-[11px] tracking-wider ${isDark ? "text-white/30" : "text-[#3D3533]/40"}`}>关联日记 / 聊天记录</label>
              <select
                value={editData.entryId || ""}
                onChange={e => setEditData(prev => ({ ...prev, entryId: e.target.value || undefined }))}
                className={`${selectClass} w-full`}
              >
                <option value="">（不关联）</option>
                {sortedEntries.map(en => (
                  <option key={en.id} value={en.id}>{en.title}（{en.date}）</option>
                ))}
              </select>
              {sortedEntries.length === 0 && (
                <p className={`text-[11px] ${isDark ? "text-white/20" : "text-[#3D3533]/30"}`}>
                  还没有日记条目 — 先去日记写一篇，再回来关联。
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
