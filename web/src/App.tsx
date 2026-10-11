import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Loader2Icon } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { AccountMenu } from "@/components/AccountMenu";
import { Logo } from "@/components/Logo";
import { NotesPage } from "@/components/NotesPage";
import { SignInPage } from "@/components/SignInPage";
import { ThemeToggle } from "@/components/ThemeToggle";

function Shell() {
  return (
    <div className="flex h-svh flex-col">
      <header className="shrink-0 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </header>
      <NotesPage />
    </div>
  );
}

export default function App() {
  return (
    <>
      <AuthLoading>
        <div className="grid min-h-svh place-items-center">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignInPage />
      </Unauthenticated>
      <Authenticated>
        <Shell />
      </Authenticated>
      <Toaster />
    </>
  );
}
