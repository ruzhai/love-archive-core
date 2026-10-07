"use client";

import React from "react";
import { motion } from "framer-motion";
import type { EntryPhoto } from "@/lib/types";
import { thumb } from "@/lib/image-url";

interface MuseumPhotoCardProps {
  photo: EntryPhoto;
  index: number;
  onClick: () => void;
}

/** Photo thumbnail card for diary entries. Click opens PhotoLightbox (handled by parent). */
const MuseumPhotoCard = React.memo(function MuseumPhotoCard({
  photo,
  index,
  onClick,
}: MuseumPhotoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="card gradient-border card-interactive break-inside-avoid overflow-hidden group cursor-pointer"
        onClick={onClick}
      >
        <div className="relative">
          {(photo.src.startsWith("/api/uploads/") || photo.src.startsWith("http")) ? (
            <img src={thumb(photo.src, 480)} alt={photo.caption} loading="lazy" decoding="async" className="w-full h-auto block" />
          ) : (
            <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
              <span className="text-2xl opacity-20">{photo.src}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <p className="text-[12px] text-white/90 tracking-wider leading-relaxed">
              {photo.caption || "无标题"}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default MuseumPhotoCard;
