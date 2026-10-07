"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import TimelineItem from "@/components/TimelineItem";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth/auth-context";
import { useEventLibrary } from "@/hooks/useEventLibrary";
import { useTimelineLibrary, type TimelineEvent } from "@/hooks/useTimelineLibrary";

export default function TimelinePage() {
  const { isAdmin } = useAuth();
  const { events: diaryEntries } = useEventLibrary();
  const { events: serverEvents, initialized, addEvent, updateEvent, deleteEvent } = useTimelineLibrary();

  const [autoEditId, setAutoEditId] = useState<string | null>(null);

  // Always sorted chronologically, so a newly-added event slots into the right
  // place instead of being dumped at the bottom.
  const timelineEvents = useMemo(
    () => [...serverEvents].sort((a, b) => a.date.localeCompare(b.date)),
    [serverEvents]
  );

  // Admin save: update local state optimistically, then persist.
  const handleUpdate = async (id: string, updates: Partial<TimelineEvent>) => {
    await updateEvent(id, updates);
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="container-page">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <PageHeader
            supertitle="Our Story"
            title="恋爱时间线"
            subtitle="每一个节点，都是我们故事里不可省略的一页。"
            className="mb-0"
          />
          {isAdmin && (
            <button
              onClick={async () => {
                // The id is generated up front and sent to the server as-is, so
                // the new event is immediately real and editable — no temp→real
                // id swap, no window where a click does nothing.
                const created = await addEvent({
                  date: new Date().toISOString().slice(0, 10),
                  title: "新事件", description: "", type: "special_moment", tags: [],
                });
                setAutoEditId(created.id);
              }}
              className="px-4 py-2 rounded-full border text-[11px] tracking-wider shrink-0 mt-3 transition-colors border-page-footer-border text-page-supertitle hover:border-page-footer-text hover:text-page-heading"
            >
              + 新建事件
            </button>
          )}
        </div>

        <div className="h-10" />

        {!initialized ? (
          <div className="flex justify-center py-12">
            <p className="text-[11px] tracking-wider text-page-footer-text">加载中…</p>
          </div>
        ) : timelineEvents.length === 0 ? (
          <div className="flex justify-center py-12">
            <p className="text-[11px] tracking-wider text-page-footer-text">还没有事件</p>
          </div>
        ) : (
          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b -translate-x-1/2 from-transparent via-page-footer-border to-transparent" />
            <div className="flex flex-col gap-8 md:gap-20">
              {timelineEvents.map((event, index) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  index={index}
                  isAdmin={isAdmin}
                  entries={diaryEntries}
                  autoEdit={event.id === autoEditId}
                  onUpdate={(updates) => handleUpdate(event.id, updates)}
                  onDelete={() => handleDelete(event.id)}
                />
              ))}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mt-24 pt-10 border-t border-page-footer-border"
        >
          <p className="text-[11px] tracking-widest text-page-footer-text">· 未完待续 ·</p>
        </motion.div>
      </div>
    </div>
  );
}
