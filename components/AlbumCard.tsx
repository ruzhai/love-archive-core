"use client";

import type { PhotoAlbum } from "@/lib/types";
import { thumb } from "@/lib/image-url";
import { useTheme } from "@/hooks/useTheme";

interface AlbumCardProps {
  album: PhotoAlbum;
  allPhotos: { id: string; src: string; width: number; height: number }[];
  isDark?: boolean;
  onClick: () => void;
  onDelete?: (id: string) => void;
}

export default function AlbumCard({ album, allPhotos, isDark: isDarkProp, onClick, onDelete }: AlbumCardProps) {
  const { theme } = useTheme();
  const isDark = isDarkProp ?? theme === "dark";
  // Cover: use coverPhotoId if set, otherwise first photo in album, else placeholder
  const coverPhoto = album.coverPhotoId
    ? allPhotos.find(p => p.id === album.coverPhotoId)
    : undefined;
  const coverSrc = coverPhoto?.src || album.coverSrc;

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg ${
        isDark ? "bg-[#0e0e0e] border-white/[0.06] hover:border-white/[0.12]" : "bg-white border-[#3D3533]/06 hover:border-[#3D3533]/15"
      }`}
    >
      {/* Cover image */}
      <div className="aspect-[4/3] bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
        {coverSrc ? (
          <img src={thumb(coverSrc, 480)} alt={album.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-20">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M3 9h18M9 3v18" />
            </svg>
            <span className="text-[11px] tracking-wider">空相簿</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      {/* Info */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate tracking-wide ${isDark ? "text-white/80" : "text-[#3D3533]"}`}>
            {album.title}
          </p>
          <p className={`text-[11px] mt-0.5 tracking-wider ${isDark ? "text-white/25" : "text-[#3D3533]/35"}`}>
            {(album.photoCount ?? 0)} 张照片
          </p>
        </div>
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); if (window.confirm(`删除相簿「${album.title}」？照片不会被删除。`)) onDelete(album.id); }}
            className={`shrink-0 text-[11px] px-2 py-0.5 rounded transition-colors ${
              isDark ? "text-white/15 hover:text-red-400/70 hover:bg-red-400/10" : "text-[#3D3533]/20 hover:text-red-500/70 hover:bg-red-100"
            }`}
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}
