import { useQuery } from "convex/react";
import { ChevronDownIcon, SettingsIcon, TagIcon } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Source } from "@/lib/notes";
import { strings } from "@/lib/strings";
import { views } from "@/lib/views";

type Props = { label: string; onSelect: (source: Source) => void; onManageTags: () => void };

/** The sidebar's choices as a menu, for phones. */
export function SourceMenu({ label, onSelect, onManageTags }: Props) {
  const tags = useQuery(api.tags.list);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="-ml-2 min-w-0 font-semibold" />}>
        <span className="truncate">{label}</span>
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[70svh] w-56">
        {views.map(({ view, label, icon: Icon }) => (
          <DropdownMenuItem key={view} onClick={() => onSelect({ kind: "view", view })}>
            <Icon /> {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{strings.nav.tags}</DropdownMenuLabel>
          {tags?.map((tag) => (
            <DropdownMenuItem key={tag._id} onClick={() => onSelect({ kind: "tag", tagId: tag._id })}>
              <TagIcon /> <span className="flex-1 truncate">{tag.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{tag.count}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={onManageTags}>
            <SettingsIcon /> {strings.nav.manageTags}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
