"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { useCapsuleLibrary, type CapsuleWithLock } from "@/hooks/useCapsuleLibrary";
import { useAuth } from "@/lib/auth/auth-context";
import { AUTHORS, authorLabel } from "@/lib/config";
import { isUnlocked, daysUntil } from "@/lib/time";

interface CapsuleForm {
  title: string;
  author: "author1" | "author2";
  mood: string;
  unlockAt: string;
  content: string;
}

const EMPTY_FORM: CapsuleForm = { title: "", author: "author1", mood: "", unlockAt: "", content: "" };

const inputCls =
  "w-full bg-transparent border-b border-page-footer-border px-1 py-2 text-sm outline-none text-page-heading placeholder:text-page-supertitle/60 focus:border-page-subtitle transition-colors";
const textareaCls =
  "w-full bg-transparent border border-page-footer-border rounded px-3 py-2 text-sm outline-none text-page-heading placeholder:text-page-supertitle/60 focus:border-page-subtitle transition-colors resize-none";

export default function CapsulesPage() {
  const { capsules, initialized, addCapsule, updateCapsule, deleteCapsule } = useCapsuleLibrary();
  const { isAdmin } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CapsuleWithLock | null>(null);
  const [form, setForm] = useState<CapsuleForm>(EMPTY_FORM);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (c: CapsuleWithLock) => {
    setEditing(c);
    setForm({
      title: c.title,
      author: c.author,
      mood: c.mood || "",
      unlockAt: c.unlockAt.slice(0, 10),
      content: c.content,
    });
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.unlockAt) return;
    const data = {
      title: form.title.trim(),
      author: form.author,
      mood: form.mood.trim() || undefined,
      unlockAt: form.unlockAt,
      content: form.content,
    };
    if (editing) {
      await updateCapsule(editing.id, data);
    } else {
      await addCapsule(data);
    }
    setFormOpen(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="container-page">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <PageHeader
            supertitle="Time Capsule"
            title="时间胶囊"
            subtitle="把一句话封起来，留给未来的我们，在某个日子拆开。"
            className="mb-0"
          />
          {isAdmin && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] tracking-widest font-medium bg-page-heading text-bg-primary hover:opacity-90 transition-opacity shrink-0 mt-3"
            >
              ＋ 写一封信
            </button>
          )}
        </div>

        <div className="h-10" />

        {!initialized ? (
          <div className="flex justify-center py-20">
            <p className="text-[11px] text-page-supertitle">加载中…</p>
          </div>
        ) : capsules.length === 0 ? (
          <EmptyState
            icon="💌"
            title="还没有时间胶囊"
            description="写给未来的信，会在这里安静等待被拆开的那一天。"
            action={
              isAdmin ? (
                <button
                  onClick={openAdd}
                  className="px-4 py-2 rounded-full text-[11px] tracking-wider border border-page-footer-border text-page-subtitle hover:text-page-heading transition-colors"
                >
                  ＋ 写下第一封
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capsules.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 2) * 0.06, ease: [0.4, 0, 0.2, 1] }}
                className="card p-6 md:p-8 relative"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0">{c.locked ? "✉️" : "💌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display-serif text-base font-bold text-page-heading leading-snug">
                          {c.title}
                        </p>
                        <p className="text-[11px] mt-1 tracking-wider text-page-supertitle">
                          {authorLabel(c.author)}
                          {c.mood ? ` · ${c.mood}` : ""} · 拆封日 {c.unlockAt.slice(0, 10)}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEdit(c)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] text-page-subtitle hover:text-page-heading bg-bg-secondary border border-page-footer-border"
                            title="编辑"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => deleteCapsule(c.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] text-page-subtitle hover:text-page-heading bg-bg-secondary border border-page-footer-border"
                            title="删除"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      {c.locked ? (
                        <div className="py-4 text-center">
                          <p className="text-sm tracking-wider text-page-subtitle mb-1">🔒 尚未拆封</p>
                          <p className="font-display-serif text-3xl font-bold text-page-heading tabular-nums">
                            {daysUntil(c.unlockAt)}
                            <span className="text-sm font-normal text-page-subtitle ml-1">天后</span>
                          </p>
                        </div>
                      ) : (
                        <>
                          {!isUnlocked(c.unlockAt) && (
                            <p className="text-[11px] mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-page-footer-border text-page-supertitle">
                              ⏳ 还有 {daysUntil(c.unlockAt)} 天拆封
                            </p>
                          )}
                          <p className="text-sm leading-relaxed tracking-wider text-page-subtitle whitespace-pre-wrap">
                            {c.content}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 写信/编辑弹窗 */}
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
                  {editing ? "编辑这封信" : "写一封信"}
                </p>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-[11px] tracking-wider text-page-supertitle mb-1.5 block">信的名字 *</span>
                    <input autoFocus value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="给未来的一封信…" className={inputCls} />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[11px] tracking-wider text-page-supertitle mb-1.5 block">作者</span>
                      <select
                        value={form.author}
                        onChange={e => setForm(p => ({ ...p, author: e.target.value as "author1" | "author2" }))}
                        className="w-full bg-transparent border-b border-page-footer-border px-1 py-2 text-sm outline-none text-page-heading focus:border-page-subtitle transition-colors"
                      >
                        <option value="author1">{AUTHORS.author1.emoji} {authorLabel("author1")}</option>
                        <option value="author2">{AUTHORS.author2.emoji} {authorLabel("author2")}</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] tracking-wider text-page-supertitle mb-1.5 block">心情</span>
                      <input value={form.mood} onChange={e => setForm(p => ({ ...p, mood: e.target.value }))} placeholder="💕" className={inputCls} />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[11px] tracking-wider text-page-supertitle mb-1.5 block">拆封日期 *</span>
                    <input
                      type="date"
                      value={form.unlockAt}
                      onChange={e => setForm(p => ({ ...p, unlockAt: e.target.value }))}
                      className={inputCls}
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] tracking-wider text-page-supertitle mb-1.5 block">正文</span>
                    <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5} placeholder="想对未来的我们说…" className={textareaCls} />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 mt-6">
                  <button onClick={() => setFormOpen(false)} className="text-[11px] px-4 py-2 rounded-full text-page-supertitle hover:text-page-heading transition-colors">
                    取消
                  </button>
                  <button
                    onClick={submit}
                    disabled={!form.title.trim() || !form.unlockAt}
                    className={`text-[11px] tracking-wider px-5 py-2 rounded-full font-medium transition-all ${
                      form.title.trim() && form.unlockAt
                        ? "bg-page-heading text-bg-primary hover:opacity-90"
                        : "opacity-30 cursor-not-allowed bg-page-footer-border text-page-supertitle"
                    }`}
                  >
                    {editing ? "保存" : "封存"}
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
