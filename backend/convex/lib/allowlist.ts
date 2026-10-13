// ALLOWED_EMAILS is a comma-separated list set with `npx convex env set`.
// Unset or empty allows nobody: the deployment fails closed.
export function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const allowed = (env().ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

// The app's typecheck pulls this file in through the generated API types and
// has no Node types, so read process.env without naming the global directly.
function env(): Record<string, string | undefined> {
  return (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
}
