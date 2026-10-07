/**
 * Database seed script.
 *
 * Usage:
 *   npx tsx lib/db/seed.ts
 *
 * Environment variables:
 *   DATABASE_PATH   — path to SQLite file (default: ./love-archive.db)
 *   ADMIN_PASSWORDS — JSON: {"author1":"password1","author2":"password2"}
 *
 * If ADMIN_PASSWORDS is not set, a random password is generated for each user
 * and printed once to stdout. Set ADMIN_PASSWORDS before the first boot if you
 * want to choose the passwords yourself.
 */

import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import path from "path";
import fs from "fs";

// 这个脚本由 `tsx` 直接执行，不经过 Next.js —— 也就没有 Next 那层 .env 自动加载。
// 不加这一句的话，用户在 .env 里设的 DATABASE_PATH / ADMIN_PASSWORDS 会被静默忽略：
// seed 建库建账号写进 A 文件，`next start` 却按 .env 去读 B 文件，于是「种子跑成功了、
// 登录却说不存在这个账号」。这里复用 Next 自己的加载器，保证两边读同一份、优先级也一致
// （已在 process.env 里的值优先，所以 Docker / 命令行注入的仍然覆盖 .env 文件）。
// 必须放在读取任何 process.env 之前 —— 紧邻的 DB_PATH 就是第一处。
loadEnvConfig(process.cwd());

const DB_PATH =
  process.env.DATABASE_PATH || path.join(process.cwd(), "love-archive.db");

// ==================== Admin passwords ====================
// Preferred: ADMIN_PASSWORDS env var, JSON: {"author1":"...","author2":"..."}
// Fallback: a fresh random password per account, printed once below.
function getAdminPasswords(): Record<string, string> {
  const raw = process.env.ADMIN_PASSWORDS;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    console.warn("[seed] ADMIN_PASSWORDS 不是合法 JSON，改用随机密码");
    return {};
  }
}

function randomPassword(): string {
  return randomBytes(12).toString("base64url");
}

// ==================== Run ====================
async function seed() {
  // Locate sql.js WASM
  const wasmPath = path.join(
    process.cwd(),
    "node_modules",
    "sql.js",
    "dist",
    "sql-wasm.wasm"
  );

  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  let db: SqlJsDatabase;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON");

  console.log(`[seed] Database: ${DB_PATH}`);

  // ---- 1. Ensure tables exist ----
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      action TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 1,
      window_start TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_identifier_action
      ON rate_limits(identifier, action);

    CREATE TABLE IF NOT EXISTS love_entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      content_author1 TEXT NOT NULL DEFAULT '',
      content_author2 TEXT NOT NULL DEFAULT '',
      photo_ids TEXT NOT NULL DEFAULT '[]',
      mood TEXT,
      first_author TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      image TEXT,
      chat_ref TEXT,
      entry_id TEXT,
      location TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS standalone_photos (
      id TEXT PRIMARY KEY,
      caption TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      src TEXT NOT NULL,
      width INTEGER NOT NULL DEFAULT 800,
      height INTEGER NOT NULL DEFAULT 600,
      sort_order INTEGER NOT NULL DEFAULT 0,
      rotation INTEGER NOT NULL DEFAULT 0,
      entry_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photo_comments (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL REFERENCES standalone_photos(id),
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      src TEXT NOT NULL,
      thumbnail TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photo_albums (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cover_photo_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photo_album_items (
      album_id TEXT NOT NULL REFERENCES photo_albums(id),
      photo_id TEXT NOT NULL REFERENCES standalone_photos(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anniversaries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      year TEXT,
      type TEXT NOT NULL DEFAULT 'custom',
      description TEXT NOT NULL DEFAULT '',
      emoji TEXT NOT NULL DEFAULT '📅',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS capsules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL,
      mood TEXT,
      unlock_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT '',
      dedication TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL DEFAULT '🎵',
      url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  console.log("[seed] Tables ensured");

  // ---- 2. Seed admin users ----
  const passwords = getAdminPasswords();
  const generated: Array<[string, string]> = [];
  const now = new Date().toISOString();
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, display_name, role, created_at)
    VALUES (?, ?, ?, 'admin', ?)
  `);

  const accounts: Array<[string, string]> = [
    ["author1", process.env.NEXT_PUBLIC_AUTHOR1_NAME || "我"],
    ["author2", process.env.NEXT_PUBLIC_AUTHOR2_NAME || "你"],
  ];

  for (const [username, displayName] of accounts) {
    const plainPassword = passwords[username] || randomPassword();
    if (!passwords[username]) generated.push([username, plainPassword]);
    const passwordHash = await hash(plainPassword, 12);
    insertUser.run([username, passwordHash, displayName, now]);
    console.log(`[seed] User "${username}" (${displayName}) seeded`);
  }

  if (generated.length > 0) {
    console.log("");
    console.log("=".repeat(52));
    console.log("  已生成随机密码，只显示这一次，请立刻保存：");
    for (const [username, plainPassword] of generated) {
      console.log(`    ${username}  /  ${plainPassword}`);
    }
    console.log("  想自己指定：先设 ADMIN_PASSWORDS 再重新部署。");
    console.log("=".repeat(52));
    console.log("");
  }

  // ---- 3. Persist to disk ----
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log("[seed] Database saved to disk");

  console.log("[seed] Done!");
}

seed().catch((err) => {
  console.error("[seed] Fatal error:", err);
  process.exit(1);
});
