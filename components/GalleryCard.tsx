"use client";

import React from "react";
import { motion } from "framer-motion";
import type { GalleryImage } from "@/lib/types";
import { formatDate } from "@/lib/data";
import { thumb } from "@/lib/image-url";
import { useTheme } from "@/hooks/useTheme";

interface GalleryCardProps {
  image: GalleryImage;
  index: number;
  isDark?: boolean;
  variant: "bento" | "masonry" | "scrollsnap" | "carousel";
  onClick: () => void;
  className?: string;
  aspectClass?: string;
}

/** Shared photo card with Apple TV+ style hover effects, permanent gradient overlay, lift effect. */
const GalleryCard = React.memo(function GalleryCard({
  image,
  index,
  isDark: isDarkProp,
  variant,
  onClick,
  className = "",
  aspectClass = "aspect-[4/3]",
}: GalleryCardProps) {
  const { theme } = useTheme();
  const isDark = isDarkProp ?? theme === "dark";
  const isRealPhoto = image.src.startsWith("/api/uploads/") || image.src.startsWith("http");

  // Decorative symbols for placeholder cards
  const iconSymbols = ["✦", "◈", "◆", "◇", "○", "▸"];
  const placeholderBg = isDark
    ? "from-[#1a1a1a] to-[#0a0a0a]"
    : "from-[#EDE8E2] to-[#E5DDD3]";

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: isDark ? "0 20px 40px -12px rgba(0,0,0,0.5)" : "0 20px 40px -12px rgba(61,53,51,0.2)" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{ willChange: "transform" }}
      onClick={onClick}
      className={`group relative cursor-pointer rounded-lg overflow-hidden gradient-border
        ${aspectClass} ${className}`}
    >
      {/* Image or placeholder */}
      {isRealPhoto ? (
        <div className="absolute inset-0" style={image.rotation ? { transform: `rotate(${image.rotation}deg)` } : undefined}>
          <img
            src={thumb(image.src, 480)}
            alt={image.caption || ""}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${placeholderBg} flex items-center justify-center`}>
          <span className="text-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40">
            {iconSymbols[index % iconSymbols.length]}
          </span>
        </div>
      )}

      {/* Permanent bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none" />

      {/* Hover-reveal caption + date — triggered by parent group hover */}
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-350 ease-out pointer-events-none">
        {image.caption && (
          <p className="text-xs text-white/90 tracking-wider leading-relaxed line-clamp-2">
            {image.caption}
          </p>
        )}
        <p className="text-[11px] text-white/45 mt-1 tracking-wider">
          {formatDate(image.date)}
        </p>
      </div>
    </motion.div>
  );
});

export default GalleryCard;
