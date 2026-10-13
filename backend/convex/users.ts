import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./lib/access";

export const me = query({
  args: {},
  returns: v.object({ email: v.optional(v.string()) }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get("users", userId);
    return { email: user?.email };
  },
});
