"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import SortablePhotoGrid from "@/components/SortablePhotoGrid";
import { useSongLibrary } from "@/hooks/useSongLibrary";
import { useAuth } from "@/lib/auth/auth-context";
import type { Song } from "@/lib/types";

interface SongForm {
  title: string;
  artist: string;
  dedication: string;
  cover: string;
  url: string;
}

const EMPTY_FORM: SongForm = { title: "", artist: "", dedication: "", cover: "🎵", url: "" };

const inputCls =
  "w-full bg-transparent border-b border-page-footer-border px-1 py-2 text-sm outline-none text-page-heading placeholder:text-page-supertitle/60 focus:border-page-subtitle transition-colors";
const textareaCls =
  "w-full bg-transparent border border-page-footer-border rounded px-3 py-2 text-sm outline-none text-page-heading placeholder:text-page-supertitle/60 focus:border-page-subtitle transition-colors resize-none";

export default function PlaylistPage() {
  const { songs, initialized, addSong, updateSong, deleteSong, reorderSongs } = useSongLibrary();
  const { isAdmin } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [form, setForm] = useState<SongForm>(EMPTY_FORM);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (song: Song) => {
    setEditing(song);
    setForm({
      title: song.title,
      artist: song.artist,
      dedication: song.dedication,
      cover: song.cover,
      url: song.url || "",
    });
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    if (editing) {
      await updateSong(editing.id, {
        title: form.title.trim(),
        artist: form.artist.trim(),
        dedication: form.dedication.trim(),
        cover: form.cover.trim() || "🎵",
        url: form.url.trim() || undefined,
      });
    } else {
      await addSong({
        title: form.title.trim(),
        artist: form.artist.trim(),
        dedication: form.dedication.trim(),
        cover: form.cover.trim() || "🎵",
        url: form.url.trim() || undefined,
      });
    }
    setFormOpen(false);
  };

  const set = (key: keyof SongForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="container-page">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <PageHeader
            supertitle="Our Songs"
            title="我们的歌"
            subtitle="每一首歌，都替我们说着当时没来得及说的话。"
            className="mb-0"
          />
          {isAdmin && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] tracking-widest font-medium bg-page-heading text-bg-primary hover:opacity-90 transition-opacity shrink-0 mt-3"
            >
              ＋ 添加歌曲
            </button>
          )}
        </div>

        <div className="h-10" />

        {!initialized ? (
          <div className="flex justify-center py-20">
            <p className="text-[11px] text-page-supertitle">加载中…</p>
          </div>
        ) : songs.length === 0 ? (
          <EmptyState
            icon="🎧"
            title="还没有收藏的歌"
            description="把你们共同喜欢的那首歌加进来吧。"
            action={
              isAdmin ? (
                <button
                  onClick={openAdd}
                  className="px-4 py-2 rounded-full text-[11px] tracking-wider border border-page-footer-border text-page-subtitle hover:text-page-heading transition-colors"
                >
                  ＋ 添加第一首歌
                </button>
              ) : undefined
            }
          />
        ) : (
          <SortablePhotoGrid
            items={songs}
            disabled={!isAdmin}
            onReorder={(ordered) => reorderSongs(ordered.map(s => s.id))}
            containerClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            renderItem={(song) => (
              <div className="card card-interactive p-6 h-full group relative">
                {/* 唱片封面 */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16 rounded-full bg-bg-secondary border border-page-footer-border flex items-center justify-center shrink-0 transition-transform duration-700 group-hover:rotate-[360deg]">
                    <span className="text-2xl">{song.cover}</span>
                    <span className="absolute w-2 h-2 rounded-full bg-page-supertitle/50" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display-serif text-base font-bold text-page-heading truncate">
                      {song.title}
                    </p>
                    {song.artist && (
                      <p className="text-[11px] mt-0.5 tracking-wider text-page-supertitle truncate">
                        {song.artist}
                      </p>
                    )}
                  </div>
                </div>

                {song.dedication && (
                  <p className="text-xs leading-relaxed tracking-wider text-page-subtitle italic line-clamp-3">
                    &ldquo;{song.dedication}&rdquo;
                  </p>
                )}

                {song.url && (
                  <a
                    href={song.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-[11px] mt-3 inline-block tracking-wider text-page-supertitle hover:text-page-heading transition-colors"
                  >
                    ▶ 去听这首歌
                  </a>
                )}

                {/* Admin actions */}
                {isAdmin && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(song); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] text-page-subtitle hover:text-page-heading bg-bg-secondary border border-page-footer-border"
                      title="编辑"
                    >
                      ✎
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSong(song.id); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] text-page-subtitle hover:text-page-heading bg-bg-secondary border border-page-footer-border"
                      title="删除"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          />
        )}

        {/* 添加/编辑弹窗 */}
        <AnimatePresence>
          {formOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[140] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setFormOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.25 }}
                className="card w-full max-w-md p-6 md:p-8"
                onClick={e => e.stopPropagation()}
              >
                <p className="font-display-serif text-lg font-bold text-page-heading mb-6">
                  {editing ? "编辑歌曲" : "添加歌曲"}
                </p>

                <div className="space-y-4">
                  <Field label="歌名 *">
                    <input autoFocus value={form.title} onChange={set("title")} onKeyDown={e => e.key === "Enter" && submit()} placeholder="歌名…" className={inputCls} />
                  </Field>
                  <Field label="艺人">
                    <input value={form.artist} onChange={set("artist")} onKeyDown={e => e.key === "Enter" && submit()} placeholder="艺人…" className={inputCls} />
                  </Field>
                  <Field label="封面 emoji">
                    <input value={form.cover} onChange={set("cover")} placeholder="🎵" className={inputCls} />
                  </Field>
                  <Field label="想说的话">
                    <textarea value={form.dedication} onChange={set("dedication")} rows={3} placeholder="这首歌，想对你说…" className={textareaCls} />
                  </Field>
                  <Field label="链接（可选）">
                    <input value={form.url} onChange={set("url")} placeholder="https://…" className={inputCls} />
                  </Field>
                </div>

                <div className="flex items-center justify-end gap-2 mt-6">
                  <button
                    onClick={() => setFormOpen(false)}
                    className="text-[11px] px-4 py-2 rounded-full text-page-supertitle hover:text-page-heading transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={submit}
                    disabled={!form.title.trim()}
                    className={`text-[11px] tracking-wider px-5 py-2 rounded-full font-medium transition-all ${
                      form.title.trim()
                        ? "bg-page-heading text-bg-primary hover:opacity-90"
                        : "opacity-30 cursor-not-allowed bg-page-footer-border text-page-supertitle"
                    }`}
                  >
                    {editing ? "保存" : "添加"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-wider text-page-supertitle mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
