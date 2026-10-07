import "server-only";

import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * sql.js keeps the *entire* database in memory, so "one process, one copy" is a
 * hard requirement rather than an optimisation.
 *
 * Next.js compiles `lib/db` into several independent server bundles — one for
 * the server components, one per route handler — and each bundle gets its own
 * module registry. Plain module-scoped `let`s would therefore yield one
 * in-memory SQLite per bundle inside a single Node process: an entry written
 * through `/api/entries` would be invisible to the server-rendered home page
 * until the process restarted (both copies write the same file, so the data
 * was never lost — only the reads diverged).
 *
 * Hanging the state off `globalThis` makes every bundle share one handle.
 */
interface DbState {
  sqlDb: SqlJsDatabase | null;
  drizzleDb: DrizzleDb | null;
  /** Set while the first {@link initDatabase} is in flight. */
  initPromise: Promise<void> | null;
  saveTimer: NodeJS.Timeout | null;
  saveChain: Promise<void>;
  exitHookRegistered: boolean;
}

type GlobalWithDbState = typeof globalThis & {
  __loveArchiveDbState__?: DbState;
};

function dbState(): DbState {
  const g = globalThis as GlobalWithDbState;
  if (!g.__loveArchiveDbState__) {
    g.__loveArchiveDbState__ = {
      sqlDb: null,
      drizzleDb: null,
      initPromise: null,
      saveTimer: null,
      saveChain: Promise.resolve(),
      exitHookRegistered: false,
    };
  }
  return g.__loveArchiveDbState__;
}

/**
 * Full schema DDL. Every statement is `IF NOT EXISTS`, so running it on
 * every server start is idempotent and self-healing: tables added to the
 * schema after a DB file was first created still get created on the next
 * start, instead of silently 500-ing on first query.
 */
const SCHEMA_DDL = `
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
`;

const DB_PATH =
  process.env.DATABASE_PATH ||
  path.join(/* turbopackIgnore: true */ process.cwd(), "love-archive.db");

/**
 * Resolve the sql.js WASM file path.
 *
 * At runtime Next.js always starts from the project root, so process.cwd()
 * resolves correctly.  The `turbopackIgnore` comment prevents the NFT
 * file-tracer from pulling in the whole project during the build.
 */
function getWasmPath(): string {
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    "node_modules",
    "sql.js",
    "dist",
    "sql-wasm.wasm"
  );
}

/**
 * Add a column to an existing table if it is missing. Idempotent and safe to
 * run on every startup — SQLite's `ALTER TABLE ADD COLUMN` is cheap and we
 * guard it behind a PRAGMA table_info check so it never throws on re-run.
 */
function ensureColumn(sqlDb: SqlJsDatabase, table: string, column: string, ddl: string): void {
  try {
    const res = sqlDb.exec(`PRAGMA table_info(${table})`);
    const names: unknown[] = res[0] ? res[0].values.map((r) => r[1]) : [];
    if (!names.includes(column)) {
      sqlDb.run(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  } catch {
    /* table may not exist yet on a fresh DB — SCHEMA_DDL already created it */
  }
}

/**
 * One-time async initialisation: load WASM → open or create DB → wire Drizzle.
 */
async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => getWasmPath(),
  });

  let sqlDb: SqlJsDatabase;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  // Enable foreign-key enforcement (WAL journal is meaningless for
  // an in-memory database — we persist manually via saveDb).
  sqlDb.run("PRAGMA foreign_keys = ON");

  // Self-healing: guarantee every table exists before the first query.
  // Without this, tables added to the schema after the DB file was first
  // created never get created (ensureTables was never wired to startup),
  // so their API routes 500 and clients silently fall back to localStorage.
  sqlDb.exec(SCHEMA_DDL);

  // Lightweight column migrations for columns added AFTER a table already
  // existed. `CREATE TABLE IF NOT EXISTS` never alters an existing table, so
  // new columns (e.g. timeline_events.entry_id) must be added explicitly.
  ensureColumn(sqlDb, "timeline_events", "entry_id", "entry_id TEXT");
  ensureColumn(sqlDb, "standalone_photos", "sort_order", "sort_order INTEGER NOT NULL DEFAULT 0");
  ensureColumn(sqlDb, "standalone_photos", "rotation", "rotation INTEGER NOT NULL DEFAULT 0");
  ensureColumn(sqlDb, "love_entries", "first_author", "first_author TEXT");
  ensureColumn(sqlDb, "photo_albums", "description", "description TEXT NOT NULL DEFAULT ''");

  dbState().sqlDb = sqlDb;
  dbState().drizzleDb = drizzle(sqlDb, { schema });

  // Register the shutdown backstop before the first async save is scheduled.
  registerExitFlush();

  // Persist any newly-created tables so external tooling sees them too.
  saveDb();
}

/**
 * Return the shared Drizzle instance (async — first call loads WASM).
 *
 * After any mutation (INSERT / UPDATE / DELETE) you **must** call
 * {@link saveDb} to persist the change to disk — sql.js keeps the
 * entire database in memory.
 */
export async function getDb(): Promise<
  ReturnType<typeof drizzle<typeof schema>>
> {
  if (!dbState().drizzleDb) {
    await ensureInitialized();
  }
  return dbState().drizzleDb!;
}

/**
 * Run {@link initDatabase} at most once per process, even when several bundles
 * race on the very first request. Without the shared in-flight promise each
 * caller would build its own `SQL.Database`, and the losers' handles — still
 * held by whichever bundle asked first — would write through a snapshot that
 * `dbState().sqlDb` no longer points at.
 */
async function ensureInitialized(): Promise<void> {
  const s = dbState();
  if (s.drizzleDb) return;
  if (!s.initPromise) {
    s.initPromise = initDatabase().catch((err) => {
      s.initPromise = null; // let the next request retry instead of caching the failure
      throw err;
    });
  }
  await s.initPromise;
}

/**
 * Persist the in-memory database to the SQLite file on disk.
 *
 * Asynchronous and coalesced: sql.js keeps the whole DB in memory, so every
 * mutation used to hit `fs.writeFileSync` synchronously — blocking the single
 * Node process event loop and making diary saves / login laggy under load.
 * Now `saveDb()` only marks the DB dirty; one debounced write exports the
 * *latest* state once the current burst of mutations settles. The write chain
 * guarantees ordering so a stale snapshot can never overwrite a newer one.
 * Callers keep calling `saveDb()` unchanged — the signature is the same.
 */
export function saveDb(): void {
  const s = dbState();
  if (!s.sqlDb) return;
  if (s.saveTimer) return; // coalesce a burst of mutations into one write
  s.saveTimer = setTimeout(() => {
    s.saveTimer = null;
    s.saveChain = s.saveChain.then(async () => {
      const db = s.sqlDb;
      if (!db) return;
      const data = db.export(); // exported at write time → latest state
      await writeFile(DB_PATH, Buffer.from(data));
    });
  }, 80);
}

/**
 * Flush any pending debounced write immediately and resolve once it's on disk.
 * Useful for tooling / graceful shutdown paths that need a durable guarantee.
 */
export async function flushDb(): Promise<void> {
  const s = dbState();
  if (s.saveTimer) {
    clearTimeout(s.saveTimer);
    s.saveTimer = null;
    s.saveChain = s.saveChain.then(async () => {
      const db = s.sqlDb;
      if (db) await writeFile(DB_PATH, Buffer.from(db.export()));
    });
  }
  await s.saveChain;
}

/**
 * On SIGINT/SIGTERM (e.g. `pm2 stop` / `pm2 restart`) write the in-memory DB
 * synchronously before exiting. The debounced async write might still be
 * pending, so this is the durability backstop that prevents losing the last
 * few mutations on shutdown.
 */
function registerExitFlush(): void {
  const s = dbState();
  if (s.exitHookRegistered) return;
  s.exitHookRegistered = true;
  const flushSync = () => {
    try {
      const db = s.sqlDb;
      if (db) fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    } catch {
      /* best-effort on shutdown */
    }
  };
  process.on("SIGINT", () => {
    flushSync();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    flushSync();
    process.exit(0);
  });
}

/**
 * Idempotently create all tables and indexes.
 * Safe to call on every server start.
 *
 * Note: {@link initDatabase} already runs {@link SCHEMA_DDL} on first access,
 * so this is only needed for callers that want to force-ensure tables without
 * performing a query first.
 */
export async function ensureTables(): Promise<void> {
  if (!dbState().sqlDb) {
    await ensureInitialized();
    return;
  }
  dbState().sqlDb!.exec(SCHEMA_DDL);
  saveDb();
}

/**
 * 导出全量数据库表数据（仅服务端/admin 使用）。
 * 返回 { 表名: 行对象数组 }，用于「应用内自助备份」——把 sql.js 内存库里的
 * 每一张业务表 dump 成可读 JSON，随时可下载留档或还原参考。
 */
export async function exportAllData(): Promise<
  Record<string, Record<string, unknown>[]>
> {
  if (!dbState().sqlDb) {
    await ensureInitialized();
  }
  const db = dbState().sqlDb!;

  // 枚举所有用户表（排除 sqlite 内部表）。
  const tableRes = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  const names = (tableRes[0]?.values ?? []).map((r) => r[0] as string);

  const out: Record<string, Record<string, unknown>[]> = {};
  for (const name of names) {
    const res = db.exec(`SELECT * FROM "${name}"`);
    const { columns, values } = res[0] ?? { columns: [] as string[], values: [] as unknown[][] };
    out[name] = values.map((row) =>
      Object.fromEntries(columns.map((col, i) => [col, row[i]]))
    );
  }
  return out;
}
