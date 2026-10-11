import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <img src="/favicon.svg?v=2" alt="" className="size-[1.2em]" />
      {strings.appName}
    </span>
  );
}
