import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function CmpCard({ className, ...props }: ComponentProps<typeof Card>) {
  return <Card className={cn("gap-3 py-4", className)} {...props} />;
}

export function CmpCardHeader({ className, ...props }: ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn("px-4", className)} {...props} />;
}

export function CmpCardTitle(props: ComponentProps<typeof CardTitle>) {
  return <CardTitle {...props} />;
}

export function CmpCardContent({ className, ...props }: ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("px-4", className)} {...props} />;
}
