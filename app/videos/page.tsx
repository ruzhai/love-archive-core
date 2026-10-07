"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/auth-context";
import { useUploadProgress } from "@/hooks/useUploadProgress";
import { useVideoLibrary, type VideoItem } from "@/hooks/useVideoLibrary";
import SortablePhotoGrid from "@/components/SortablePhotoGrid";
import PageHeader from "@/components/PageHeader";

export default function VideosPage() {
  const { isAdmin } = useAuth();
  const { addTask, updateTask, removeTask } = useUploadProgress();
  const { videos, initialized, addVideo, updateVideo, deleteVideo } = useVideoLibrary();
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState<VideoItem | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const taskId = addTask(file.name);
      try {
        const fd = new FormData(); fd.append("file", file);
        await new Promise<void>((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) updateTask(taskId, Math.round((ev.loaded / ev.total) * 100)); };
          xhr.onload = async () => {
            try {
              const json = JSON.parse(xhr.responseText);
              if (json.success) {
                await addVideo({
                  id: json.id,
                  title: file.name.replace(/\.[^.]+$/, ""),
                  date: new Date().toISOString().slice(0, 10),
                  src: json.url,
                });
                updateTask(taskId, 100, "done");
              } else { updateTask(taskId, 100, "error"); }
            } catch { updateTask(taskId, 100, "error"); }
            resolve();
          };
          xhr.onerror = () => { updateTask(taskId, 100, "error"); resolve(); };
          xhr.open("POST", "/api/upload/video");
          xhr.timeout = 120000;
          xhr.send(fd);
        });
      } catch { }
      setTimeout(() => removeTask(taskId), 6000);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReOrder = useCallback((ordered: VideoItem[]) => {
    ordered.forEach((v, i) => updateVideo(v.id, { sortOrder: i }));
  }, [updateVideo]);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="container-page">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <PageHeader
            supertitle="Moving Memories"
            title="视频影院"
            subtitle="会动的回忆，比照片更鲜活。"
            className="mb-0"
          />
          {isAdmin && (
            <label className={`px-4 py-2 rounded-full cursor-pointer transition-all shrink-0 mt-3 text-[11px] tracking-wider font-medium bg-page-heading text-bg-primary hover:opacity-90 ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}>
              <input ref={fileInputRef} type="file" accept="video/*" multiple onChange={handleUpload} className="hidden" />
              {uploading ? "上传中…" : "+ 上传视频"}
            </label>
          )}
        </div>

        <div className="h-10" />

        {!initialized ? (
          <div className="flex justify-center py-20"><p className="text-[11px] text-page-footer-text">加载中…</p></div>
        ) : videos.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <span className="text-4xl block mb-4 opacity-20">🎬</span>
              <p className="text-xs tracking-wider text-page-supertitle">还没有视频</p>
            </div>
          </div>
        ) : (
          <SortablePhotoGrid
            items={videos}
            disabled={!isAdmin}
            onReorder={handleReOrder}
            containerClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            renderItem={(video, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
                className="card card-interactive group overflow-hidden rounded-xl"
              >
                {/* Video thumbnail — muted auto-play first frame */}
                <div className="aspect-video bg-[#0a0a0a] relative overflow-hidden cursor-pointer" onClick={() => setPlaying(video)}>
                  <video src={video.src} preload="metadata" muted className="w-full h-full object-cover"
                    onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  {editingTitle === video.id ? (
                    <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { updateVideo(video.id, { title: editValue }); setEditingTitle(null); } }}
                      onBlur={() => { if (editValue.trim()) updateVideo(video.id, { title: editValue.trim() }); setEditingTitle(null); }}
                      className="w-full text-sm bg-transparent border-b outline-none border-page-footer-border text-page-heading" />
                  ) : (
                    <h3 onClick={() => { if (isAdmin) { setEditingTitle(video.id); setEditValue(video.title); } }}
                      className={`text-sm tracking-wide truncate ${isAdmin ? "cursor-pointer hover:opacity-70" : ""} text-page-heading`}>
                      {video.title}
                    </h3>
                  )}
                  <p className="text-[11px] mt-1 tracking-wider text-page-supertitle">{video.date}</p>
                </div>

                {isAdmin && (
                  <button onClick={e => { e.stopPropagation(); if (window.confirm("删除这个视频？")) deleteVideo(video.id); }}
                    className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 text-[11px] px-2 py-1 rounded bg-black/50 text-white/50 hover:text-red-400 transition-all">删除</button>
                )}
              </motion.div>
            )}
          />
        )}

        {/* Video player lightbox */}
        <AnimatePresence>
          {playing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 md:p-12"
              onClick={() => setPlaying(null)}>
              <div className="absolute top-4 right-4 z-20">
                <button onClick={() => setPlaying(null)}
                  className="px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all text-sm tracking-wider">关闭</button>
              </div>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="relative max-w-6xl w-full" onClick={e => e.stopPropagation()}>
                <div className="aspect-video bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/[0.06] shadow-2xl">
                  <video src={playing.src} controls autoPlay className="w-full h-full"
                    onError={() => alert("视频加载失败")} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-sm text-white/80 tracking-wider font-medium">{playing.title}</p>
                    <p className="text-[11px] text-white/30 mt-0.5 tracking-wider">{playing.date}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => { deleteVideo(playing.id); setPlaying(null); }}
                      className="text-[11px] text-white/20 hover:text-red-400 transition-colors tracking-wider">删除视频</button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.7 }} className="text-center mt-24 pt-10 border-t border-page-footer-border">
          <p className="text-[11px] tracking-widest text-page-footer-text">· 会动的记忆碎片 ·</p>
        </motion.div>
      </div>
    </div>
  );
}
