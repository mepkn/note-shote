import { useQuery } from "convex/react";
import { SettingsIcon, TagIcon } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { sameSource, type Source } from "@/lib/notes";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { views } from "@/lib/views";

const s = strings.nav;

type Props = {
  source: Source;
  searching: boolean;
  onSelect: (source: Source) => void;
  onManageTags: () => void;
};

/** Views and tags, on wide screens. Phones get the same choices from SourceMenu. */
export function Sidebar({ source, searching, onSelect, onManageTags }: Props) {
  const tags = useQuery(api.tags.list);
  const active = (other: Source) => !searching && sameSource(source, other);
  return (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      <div className="flex flex-col gap-0.5">
        {views.map(({ view, label, icon: Icon }) => (
          <Item key={view} active={active({ kind: "view", view })} onClick={() => onSelect({ kind: "view", view })}>
            <Icon /> {label}
          </Item>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-xs font-medium text-muted-foreground">{s.tags}</span>
          <Button variant="ghost" size="icon-xs" aria-label={s.manageTags} title={s.manageTags} onClick={onManageTags}>
            <SettingsIcon />
          </Button>
        </div>
        {tags?.length === 0 && <p className="px-2 text-xs text-muted-foreground">{s.noTags}</p>}
        {tags?.map((tag) => (
          <Item
            key={tag._id}
            active={active({ kind: "tag", tagId: tag._id })}
            onClick={() => onSelect({ kind: "tag", tagId: tag._id })}
          >
            <TagIcon />
            <span className="flex-1 truncate">{tag.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{tag.count}</span>
          </Item>
        ))}
      </div>
    </nav>
  );
}

function Item({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        active && "bg-accent font-medium text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}
