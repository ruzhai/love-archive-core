import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // These three rules are downgraded rather than silenced: the violations are
    // real and still show up in `npm run lint` output, they just don't fail CI.
    //
    // - no-explicit-any: the service layer deliberately takes loose
    //   `Record<string, any>` inputs, because the API accepts both camelCase
    //   and snake_case keys (see normalizeEntryInput). Typing that precisely is
    //   a refactor of its own, not a drive-by fix.
    // - set-state-in-effect: the collection hooks sync client state from
    //   /api/* on mount and on server-availability changes. Restructuring them
    //   to satisfy the rule changes real behaviour, so it needs its own pass
    //   with tests, not a lint fix.
    // - no-unescaped-entities: cosmetic only.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
