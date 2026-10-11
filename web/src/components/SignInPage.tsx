import { useState, type FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage } from "@/lib/errors";
import { strings } from "@/lib/strings";

type Flow = "signIn" | "signUp";

const s = strings.auth;

/** Email + password. Sign-up only works for emails in ALLOWED_EMAILS. */
export function SignInPage() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<Flow>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignUp = flow === "signUp";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("email", String(formData.get("email")).trim().toLowerCase());
    formData.set("flow", flow);
    try {
      await signIn("password", formData);
    } catch (err) {
      setError(authErrorMessage(err, flow));
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex w-full flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-lg font-semibold">{isSignUp ? s.signUpTitle : s.signInTitle}</h1>
            <p className="text-sm text-muted-foreground">{isSignUp ? s.signUpSubtitle : s.signInSubtitle}</p>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{s.email}</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{s.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
              />
              {isSignUp && <p className="text-xs text-muted-foreground">{s.passwordHint}</p>}
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />}
              {isSignUp ? s.signUp : s.logIn}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => {
                setFlow(isSignUp ? "signIn" : "signUp");
                setError(null);
              }}
            >
              {isSignUp ? s.haveAccount : s.noAccount}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
