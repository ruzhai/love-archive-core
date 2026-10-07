import "server-only";

import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

// ==================== Users ====================
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("admin"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  lastLoginAt: text("last_login_at"),
});

// ==================== Audit Log ====================
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull(),
});

// ==================== Love Entries ====================
export const loveEntries = sqliteTable("love_entries", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  date: text("date").notNull(),
  contentAuthor1: text("content_author1").notNull().default(""),
  contentAuthor2: text("content_author2").notNull().default(""),
  photoIds: text("photo_ids").notNull().default("[]"),
  mood: text("mood"),
  firstAuthor: text("first_author"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ==================== Standalone Photos ====================
export const standalonePhotos = sqliteTable("standalone_photos", {
  id: text("id").primaryKey(),
  caption: text("caption").notNull().default(""),
  date: text("date").notNull(),
  src: text("src").notNull(),
  width: integer("width").notNull().default(800),
  height: integer("height").notNull().default(600),
  sortOrder: integer("sort_order").notNull().default(0),
  rotation: integer("rotation").notNull().default(0),
  entryId: text("entry_id"),
  createdAt: text("created_at").notNull(),
});

// ==================== Photo Comments ====================
export const photoComments = sqliteTable("photo_comments", {
  id: text("id").primaryKey(),
  photoId: text("photo_id").notNull().references(() => standalonePhotos.id),
  author: text("author").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

// ==================== Timeline Events ====================
export const timelineEvents = sqliteTable("timeline_events", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type").notNull(),
  tags: text("tags").notNull().default("[]"),
  image: text("image"),
  chatRef: text("chat_ref"),
  entryId: text("entry_id"),
  location: text("location"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ==================== Videos ====================
export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  src: text("src").notNull(),
  thumbnail: text("thumbnail"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});


// ==================== Photo Albums ====================
export const photoAlbums = sqliteTable("photo_albums", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  coverPhotoId: text("cover_photo_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const photoAlbumItems = sqliteTable("photo_album_items", {
  albumId: text("album_id").notNull().references(() => photoAlbums.id),
  photoId: text("photo_id").notNull().references(() => standalonePhotos.id),
  sortOrder: integer("sort_order").notNull().default(0),
  addedAt: text("added_at").notNull(),
});

// ==================== Anniversaries (纪念日) ====================
export const anniversaries = sqliteTable("anniversaries", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  // 月-日（MM-DD），每年复现；如生日、第一次旅行纪念等自定义纪念日。
  date: text("date").notNull(),
  // 起始年份（可空），用于计算「第几个周年」。
  year: text("year"),
  // relationship / birthday / first_meeting / custom
  type: text("type").notNull().default("custom"),
  description: text("description").notNull().default(""),
  emoji: text("emoji").notNull().default("📅"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// ==================== Time Capsules (时间胶囊 / 写给未来的信) ====================
export const capsules = sqliteTable("capsules", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  // author1 / author2
  author: text("author").notNull(),
  mood: text("mood"),
  // 解锁日期（ISO），未到则为「未拆的信」
  unlockAt: text("unlock_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ==================== Songs (我们的歌 / 歌单) ====================
export const songs = sqliteTable("songs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull().default(""),
  // 想说的话
  dedication: text("dedication").notNull().default(""),
  // emoji 或渐变标识，用作唱片封面
  cover: text("cover").notNull().default("🎵"),
  url: text("url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// ==================== Rate Limits ====================
export const rateLimits = sqliteTable(
  "rate_limits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    identifier: text("identifier").notNull(),
    action: text("action").notNull(),
    attempts: integer("attempts").notNull().default(1),
    windowStart: text("window_start").notNull(),
  },
  (table) => ({
    uniqueIdentifierAction: uniqueIndex("idx_identifier_action").on(
      table.identifier,
      table.action
    ),
  })
);
