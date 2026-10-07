import "server-only";

import { getMemoriesForToday } from "@/lib/memories";
import { getUpcomingAnniversaries, type UpcomingAnniversary } from "@/lib/anniversaries";
import type { OnThisDay } from "@/lib/types";
import { listEntries } from "@/lib/services/entry-service";
import { listPhotos } from "@/lib/services/photo-service";
import { listVideos } from "@/lib/services/video-service";
import { listTimelineEvents } from "@/lib/services/timeline-service";

// ==================== 首页「档案馆大厅」聚合 ====================
// 首页是服务端组件，这里一次性把大厅需要的动态数据聚合好再传给展示组件。

export interface RecentEntry {
  id: string;
  title: string;
  summary: string;
  date: string;
}

export interface RecentPhoto {
  id: string;
  caption: string;
  src: string;
  date: string;
}

export interface RecentVideo {
  id: string;
  title: string;
  thumbnail: string | null;
  date: string;
}

export interface RecentEvent {
  id: string;
  title: string;
  description: string;
  date: string;
}

export interface RecentActivity {
  entry: RecentEntry | null;
  photo: RecentPhoto | null;
  video: RecentVideo | null;
  event: RecentEvent | null;
}

export interface ArchiveCounts {
  totalEntries: number;
  totalPhotos: number;
  totalVideos: number;
  totalMilestones: number;
}

export interface HomeData {
  onThisDay: OnThisDay;
  upcomingAnniversaries: UpcomingAnniversary[];
  recent: RecentActivity;
  counts: ArchiveCounts;
}

function byDateDesc<T extends { date: string }>(a: T, b: T): number {
  return b.date.localeCompare(a.date);
}

export async function getHomeData(): Promise<HomeData> {
  const [onThisDay, upcoming, entries, photos, videos, events] = await Promise.all([
    getMemoriesForToday(),
    getUpcomingAnniversaries(),
    listEntries(),
    listPhotos(),
    listVideos(),
    listTimelineEvents(),
  ]);

  const latestEntry = [...entries].sort(byDateDesc)[0] ?? null;
  const latestPhoto = [...photos].sort(byDateDesc)[0] ?? null;
  const latestVideo = [...videos].sort(byDateDesc)[0] ?? null;
  const latestEvent = [...events].sort(byDateDesc)[0] ?? null;

  return {
    onThisDay,
    upcomingAnniversaries: upcoming,
    recent: {
      entry: latestEntry
        ? { id: latestEntry.id, title: latestEntry.title, summary: latestEntry.summary, date: latestEntry.date }
        : null,
      photo: latestPhoto
        ? { id: latestPhoto.id, caption: latestPhoto.caption, src: latestPhoto.src, date: latestPhoto.date }
        : null,
      video: latestVideo
        ? { id: latestVideo.id, title: latestVideo.title, thumbnail: latestVideo.thumbnail, date: latestVideo.date }
        : null,
      event: latestEvent
        ? { id: latestEvent.id, title: latestEvent.title, description: latestEvent.description, date: latestEvent.date }
        : null,
    },
    counts: {
      totalEntries: entries.length,
      totalPhotos: photos.length,
      totalVideos: videos.length,
      totalMilestones: events.length,
    },
  };
}
