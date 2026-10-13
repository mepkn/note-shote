import { ConvexError } from "convex/values";
import { strings } from "./strings";

export function errorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return undefined;
}

export function errorMessage(error: unknown): string {
  const code = errorCode(error);
  return (code && strings.errors[code]) || strings.somethingWentWrong;
}

// Convex Auth reports bad credentials and duplicate accounts as plain errors.
export function authErrorMessage(error: unknown, flow: "signIn" | "signUp"): string {
  const code = errorCode(error);
  if (code) return strings.errors[code] ?? strings.somethingWentWrong;
  const message = error instanceof Error ? error.message : "";
  if (/already exists/i.test(message)) return strings.errors.accountExists;
  if (flow === "signIn" && /InvalidAccountId|InvalidSecret|Invalid credentials/i.test(message)) {
    return strings.errors.invalidCredentials;
  }
  // Production hides plain error text ("Server Error"). Validation failures are
  // ConvexErrors handled above, so a remaining sign-up failure is a taken email.
  return flow === "signIn" ? strings.errors.invalidCredentials : strings.errors.accountExists;
}
