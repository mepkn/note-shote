import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { isAllowedEmail } from "./lib/allowlist";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ConvexError("invalidEmail");
        }
        // Runs for sign-up and sign-in alike, before anything is stored.
        if (!isAllowedEmail(email)) {
          throw new ConvexError("notAllowed");
        }
        return { email };
      },
      validatePasswordRequirements(password) {
        if (password.length < 8) {
          throw new ConvexError("passwordTooShort");
        }
      },
    }),
  ],
});
