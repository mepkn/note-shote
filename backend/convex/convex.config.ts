import { defineApp } from "convex/server";
import { v } from "convex/values";

// Optional here so a fresh deployment still starts; unset means nobody can
// sign in (see lib/allowlist.ts).
const app = defineApp({
  env: { ALLOWED_EMAILS: v.optional(v.string()) },
});

export default app;
