"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { GalleryImage } from "@/lib/types";
import GalleryCard from "@/components/GalleryCard";
import PhotoLightbox from "@/components/PhotoLightbox";
import SortablePhotoGrid from "@/components/SortablePhotoGrid";
import { useTheme } from "@/hooks/useTheme";

interface PhotoTimelineProps {
  images: GalleryImage[];
  isAdmin: boolean;
  isDark?: boolean;
  onDeletePhoto?: (photoId: string) => void;
  onCaptionChange?: (photoId: string, caption: string) => void;
  onDateChange?: (photoId: string, newDate: string) => void;
  onAddToDiary?: (image: GalleryImage) => void;
  onRotate?: (photoId: string, newRotation: number) => void;
  onPhotosReorder?: (orderedIds: string[]) => void;
  entries?: any[];
}

/** Group photos by date (descending), each group gets a date header.
 *  Within each group, items are sorted by sortOrder ascending. */
function groupByDate(images: GalleryImage[]): { date: string; items: GalleryImage[] }[] {
  const map = new Map<string, GalleryImage[]>();
  for (const img of images) {
    const d = img.date || "未知日期";
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(img);
  }
  // Sort dates descending (newest first), and items within each group by sortOrder
  const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  return sorted.map(([date, items]) => ({
    date,
    items: items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  }));
}

/** Format date like "2026年7月9日 星期四" for display */
function formatDateLabel(dateStr: string): string {
  if (dateStr === "未知日期") return dateStr;
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  } catch {
    return dateStr;
  }
}

export default function PhotoTimeline({
  images,
  isAdmin,
  isDark: isDarkProp,
  onDeletePhoto,
  onCaptionChange,
  onDateChange,
  onAddToDiary,
  onRotate,
  onPhotosReorder,
  entries = [],
}: PhotoTimelineProps) {
  const { theme } = useTheme();
  const isDark = isDarkProp ?? theme === "dark";
  const grouped = useMemo(() => groupByDate(images), [images]);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Build flat index map for lightbox
  const flatImages = useMemo(() => grouped.flatMap(g => g.items), [grouped]);

  // Resolve the open photo by id (not a raw index) so that when a date edit
  // re-sorts / re-groups the wall, the lightbox stays on the SAME photo instead
  // of showing whatever now happens to sit at the old index.
  const lightboxIndex = lightboxId !== null ? flatImages.findIndex(img => img.id === lightboxId) : -1;

  useEffect(() => {
    if (editingDate && inputRef.current) inputRef.current.focus();
  }, [editingDate]);

  if (images.length === 0) return null;

  return (
    <div className="space-y-16">
      {grouped.map((group) => (
        <section key={group.date}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-6">
            {isAdmin && onDateChange ? (
              editingDate === group.date ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const newDate = editValue.trim();
                    if (newDate && newDate !== group.date) {
                      // Update all photos in this group to the new date
                      group.items.forEach(img => onDateChange(img.id, newDate));
                    }
                    setEditingDate(null);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => setEditingDate(null)}
                    className={`text-lg md:text-xl font-light tracking-wider bg-transparent border-b outline-none ${
                      isDark
                        ? "text-white/80 border-white/20 focus:border-white/40"
                        : "text-[#3D3533]/80 border-[#3D3533]/20 focus:border-[#3D3533]/40"
                    }`}
                  />
                </form>
              ) : (
                <button
                  onClick={() => { setEditingDate(group.date); setEditValue(group.date); }}
                  className={`text-lg md:text-xl font-light tracking-wider transition-colors cursor-pointer hover:opacity-70 ${
                    isDark ? "text-white/70" : "text-[#3D3533]/70"
                  }`}
                  title="点击编辑日期"
                >
                  {formatDateLabel(group.date)}
                </button>
              )
            ) : (
              <h2 className={`text-lg md:text-xl font-light tracking-wider ${
                isDark ? "text-white/60" : "text-[#3D3533]/60"
              }`}>
                {formatDateLabel(group.date)}
              </h2>
            )}
            <span className={`text-[11px] tracking-wider ${
              isDark ? "text-white/20" : "text-[#3D3533]/25"
            }`}>
              {group.items.length} 张
            </span>
          </div>

          {/* Photo grid — sortable grid with drag-and-drop for admin */}
          <SortablePhotoGrid
            items={group.items}
            disabled={!isAdmin}
            onReorder={(ordered) => {
              onPhotosReorder?.(ordered.map(img => img.id));
            }}
            containerClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            renderItem={(image, idx) => (
              <motion.div
                className="cv-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: (idx % 8) * 0.04 }}
              >
                <GalleryCard
                  image={image}
                  index={idx}
                  isDark={isDark}
                  variant="masonry"
                  onClick={() => setLightboxId(image.id)}
                />
              </motion.div>
            )}
          />
        </section>
      ))}

      {/* Lightbox */}
      {lightboxIndex >= 0 && (
        <PhotoLightbox
          images={flatImages}
          selectedIndex={lightboxIndex}
          entries={entries}
          onClose={() => setLightboxId(null)}
          onNavigate={(i) => setLightboxId(flatImages[i]?.id ?? null)}
          onCaptionChange={onCaptionChange}
          onDateChange={onDateChange}
          onDeletePhoto={onDeletePhoto}
          onAddToDiary={onAddToDiary}
          onRotate={onRotate}
        />
      )}
    </div>
  );
}
