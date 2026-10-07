// ==================== Timeline ====================
export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: TimelineEventType;
  tags: string[];
  image?: string;
  chatRef?: string;
  entryId?: string;   // 关联的日记条目 id（点开可跳到该日记 / 聊天记录）
  location?: string;
}

export type TimelineEventType =
  | "first_chat"
  | "first_video_call"
  | "first_meeting"
  | "first_date"
  | "first_hold_hands"
  | "first_argue"
  | "first_makeup"
  | "official"
  | "holiday"
  | "anniversary"
  | "special_moment";

export const eventTypeLabels: Record<TimelineEventType, string> = {
  first_chat: "第一次聊天",
  first_video_call: "第一次视频",
  first_meeting: "第一次见面",
  first_date: "第一次约会",
  first_hold_hands: "第一次牵手",
  first_argue: "第一次争吵",
  first_makeup: "第一次和好",
  official: "正式在一起",
  holiday: "节日",
  anniversary: "纪念日",
  special_moment: "特别时刻",
};

// ==================== Love Museum Entries ====================

export interface EntryPhoto {
  id: string;          // 全局唯一 ID，用于照片墙索引
  caption: string;     // 照片说明
  date: string;        // 拍摄日期
  src: string;         // 占位符图案或真实路径
  width: number;       // 宽
  height: number;      // 高
}

/** Independent photo stored in love-archive-photos. Can optionally link to a LoveEntry. */
export interface StandalonePhoto {
  id: string;
  caption: string;
  date: string;
  src: string;
  width: number;
  height: number;
  sortOrder: number;
  rotation: number;
  entryId: string | null;  // null = standalone, non-null = linked to an entry
  createdAt: string;
}

export interface PhotoComment {
  id: string;
  photoId: string;
  author: "author1" | "author2";
  content: string;
  createdAt: string;
}

export interface PhotoAlbum {
  id: string;
  title: string;
  description?: string;
  coverPhotoId?: string;
  sortOrder: number;
  createdAt: string;
  photoCount?: number;
  coverSrc?: string;
}

export interface LoveEntry {
  id: string;
  title: string;
  summary: string;
  date: string;

  // 两位作者各写一段，都是 Markdown
  content_author1: string;
  content_author2: string;
  /** @deprecated 使用 photoIds 替代。旧数据兼容保留。 */
  photos: EntryPhoto[];
  /** 照片 ID 引用（新格式）。与 usePhotoLibrary 配合使用。 */
  photoIds: string[];

  // 元数据
  mood?: string;
  firstAuthor?: string;
  createdAt: string;
  updatedAt: string;
}

// 向后兼容别名
export type CuratedEvent = LoveEntry;

export type EventSortMode = "date-asc" | "date-desc" | "updated-desc" | "created-desc" | "title-asc";

export const eventSortLabels: Record<EventSortMode, string> = {
  "date-asc": "按时间正序",
  "date-desc": "按时间倒序",
  "updated-desc": "最近修改",
  "created-desc": "最近创建",
  "title-asc": "按名称排序",
};

// ==================== Videos ====================
export interface VideoItem {
  id: string;
  title: string;
  date: string;
  description: string;
  coverImage: string;
  videoUrl: string;
  duration: string;
  tags: string[];
  featured: boolean;
}

// ==================== Gallery ====================
export interface GalleryImage {
  id: string;
  src: string;
  date: string;
  caption: string;
  width: number;
  height: number;
  sortOrder: number;
  rotation: number;
  _entryId?: string;
  _entryTitle?: string;
  _entryContent?: string;  // 日记正文片段，轮播时显示
}

// GalleryMode and GallerySortMode removed — photo wall now uses simple date-grouped timeline

// ==================== Anniversaries ====================
export type AnniversaryType =
  | "relationship"
  | "birthday"
  | "first_meeting"
  | "custom";

export const anniversaryTypeLabels: Record<AnniversaryType, string> = {
  relationship: "在一起",
  birthday: "生日",
  first_meeting: "初识",
  custom: "自定义",
};

export interface Anniversary {
  id: string;
  title: string;
  /** 月-日（MM-DD），每年复现 */
  date: string;
  /** 起始年份（可空），用于计算「第几个周年」 */
  year?: string | null;
  type: AnniversaryType;
  description: string;
  emoji: string;
  sortOrder: number;
  createdAt: string;
}

// ==================== Time Capsules ====================
export interface Capsule {
  id: string;
  title: string;
  content: string;
  author: "author1" | "author2";
  mood?: string | null;
  /** 解锁日期（ISO），未到则为「未拆的信」 */
  unlockAt: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 那年今日 (On This Day) ====================
export type MemoryKind = "chat" | "photo" | "entry" | "event";

export const memoryKindMeta: Record<MemoryKind, { emoji: string; label: string }> = {
  chat: { emoji: "💬", label: "聊天" },
  photo: { emoji: "📷", label: "照片" },
  entry: { emoji: "📖", label: "日记" },
  event: { emoji: "⚓", label: "节点" },
};

export interface OnThisDayMemory {
  kind: MemoryKind;
  date: string; // YYYY-MM-DD
  year: string;
  title: string;
  subtitle?: string;
  src?: string; // 照片缩略图
  href: string;
}

export interface OnThisDay {
  monthDay: string; // MM-DD
  memories: OnThisDayMemory[];
  total: number;
  hasContent: boolean;
}

// ==================== Songs ====================
export interface Song {
  id: string;
  title: string;
  artist: string;
  /** 想说的话 */
  dedication: string;
  /** emoji 或渐变标识，用作唱片封面 */
  cover: string;
  url?: string | null;
  sortOrder: number;
  createdAt: string;
}
