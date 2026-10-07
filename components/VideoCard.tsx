"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoItem } from "@/lib/types";
import { formatDate } from "@/lib/data";
import { useTheme } from "@/hooks/useTheme";

interface VideoCardProps {
  video: VideoItem;
  index: number;
}

export default function VideoCard({ video, index }: VideoCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setIsPlaying(true);
    setTimeout(() => videoRef.current?.play(), 100);
  };

  const handleClose = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  const posterBg = isDark
    ? "from-[#1a1a1a] to-[#0a0a0a]"
    : "from-[#EDE8E2] to-[#E5DDD3]";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        whileHover={{ rotateY: 3, scale: 1.02 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        onClick={handlePlay}
        className="card card-interactive group cursor-pointer overflow-hidden"
        style={{ perspective: "1000px" }}
      >
        {/* Poster area */}
        <div className={`relative aspect-[3/4] bg-[var(--bg-card)] overflow-hidden`}>
          <div className={`absolute inset-0 bg-gradient-to-b ${posterBg} flex items-center justify-center`}>
            <span className="text-5xl opacity-30 transition-opacity duration-500 group-hover:opacity-50">
              🎬
            </span>
          </div>

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center animate-pulse-soft">
              <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-0.5" />
            </div>
          </div>

          {/* Duration badge */}
          <span className="absolute bottom-3 right-3 text-[11px] px-2 py-0.5 rounded bg-black/60 text-white/60 tracking-wider">
            {video.duration}
          </span>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className={`text-sm tracking-wide transition-colors duration-500 ${
            isDark
              ? "text-white/80 group-hover:text-black"
              : "text-[#3D3533]/80 group-hover:text-[#FBF7F2]"
          }`}>
            {video.title}
          </h3>
          <p className={`text-[11px] mt-1 tracking-wider transition-colors duration-500 ${
            isDark
              ? "text-white/25 group-hover:text-black/50"
              : "text-[#3D3533]/30 group-hover:text-[#FBF7F2]/50"
          }`}>
            {formatDate(video.date)}
          </p>
        </div>
      </motion.div>

      {/* Video player modal — always dark */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="relative max-w-4xl w-full aspect-video bg-[#0a0a0a] rounded-lg overflow-hidden border border-white/[0.08]"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                ref={videoRef}
                src={video.videoUrl}
                controls
                className="w-full h-full object-contain"
                poster={video.coverImage}
              >
                您的浏览器不支持视频播放。
              </video>

              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors z-10"
              >
                ✕
              </button>

              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                <h3 className="text-base text-white font-light tracking-wide">
                  {video.title}
                </h3>
                <p className="text-xs text-white/30 mt-1 tracking-wider">
                  {video.description}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
