import type { Config } from "drizzle-kit";
import path from "path";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url:
      process.env.DATABASE_PATH || path.join(process.cwd(), "love-archive.db"),
  },
} satisfies Config;
