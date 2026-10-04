import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  className?: string;
  children: ReactNode;
};

// A titled dialog; children are mounted only while it is open.
export function CmpDialog({ open, onOpenChange, title, className, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className={cn("w-[90vw] max-w-md", className)}>
          <DialogHeader className="text-left">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      )}
    </Dialog>
  );
}
