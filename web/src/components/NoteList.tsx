import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Loader2Icon, PinIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { PAGE_SIZE, timeAgo, type Source } from "@/lib/notes";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const s = strings.list;

type Props = {
  source: Source;
  search: string;
  selectedId: string;
  onOpen: (id: Id<"notes">) => void;
};

/** One page source at a time: a search, a tag's notes, or a view. */
export function NoteList({ source, search, selectedId, onOpen }: Props) {
  const tags = useQuery(api.tags.list);
  const tagNames = new Map(tags?.map((t) => [t._id, t.name]));
  const searching = search.length > 0;
  const bySearch = usePaginatedQuery(api.notes.search, searching ? { query: search } : "skip", {
    initialNumItems: PAGE_SIZE,
  });
  const byTag = usePaginatedQuery(
    api.notes.byTag,
    !searching && source.kind === "tag" ? { tagId: source.tagId } : "skip",
    { initialNumItems: PAGE_SIZE },
  );
  const byView = usePaginatedQuery(
    api.notes.list,
    !searching && source.kind === "view" ? { view: source.view } : "skip",
    { initialNumItems: PAGE_SIZE },
  );
  const { results, status, loadMore } = searching ? bySearch : source.kind === "tag" ? byTag : byView;
  // Search and tag lists mix views, so their notes say where they are.
  const mixed = searching || source.kind === "tag";
  const inTrash = !searching && source.kind === "view" && source.view === "trash";

  const emptyText = searching ? s.empty.search : source.kind === "tag" ? s.empty.tag : s.empty[source.view];

  return (
    <div className="flex flex-col">
      {inTrash && <TrashBar hasNotes={results.length > 0} />}
      {status === "LoadingFirstPage" ? (
        <div className="grid place-items-center py-12">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col p-2">
          {results.map((note) => (
            <li key={note._id}>
              <button
                type="button"
                onClick={() => onOpen(note._id)}
                aria-current={note._id === selectedId ? "true" : undefined}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent",
                  note._id === selectedId && "bg-accent",
                )}
              >
                <div className="flex items-center gap-1.5">
                  {note.pinned && <PinIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label={s.pinned} />}
                  <span className={cn("truncate font-medium", !note.title && !note.fallbackTitle && "text-muted-foreground")}>
                    {note.title || note.fallbackTitle || strings.list.untitled}
                  </span>
                </div>
                {note.preview && <p className="line-clamp-2 text-sm text-muted-foreground">{note.preview}</p>}
                <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <span>{timeAgo(note.updatedAt)}</span>
                  {mixed && note.deletedAt !== undefined && <Badge variant="destructive">{s.inTrash}</Badge>}
                  {mixed && note.archived && <Badge variant="secondary">{s.archived}</Badge>}
                  {note.tagIds.map((id) =>
                    tagNames.has(id) ? (
                      <Badge key={id} variant="outline">
                        {tagNames.get(id)}
                      </Badge>
                    ) : null,
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div className="flex justify-center pb-4">
          <Button variant="outline" size="sm" disabled={status === "LoadingMore"} onClick={() => loadMore(PAGE_SIZE)}>
            {status === "LoadingMore" && <Loader2Icon className="animate-spin" />}
            {s.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}

function TrashBar({ hasNotes }: { hasNotes: boolean }) {
  const emptyTrash = useMutation(api.notes.emptyTrash);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
      <span>{s.trashHint}</span>
      {hasNotes && (
        <Button variant="ghost" size="xs" className="text-destructive" onClick={() => setConfirming(true)}>
          {s.emptyTrash}
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={s.emptyTrashTitle}
        description={s.emptyTrashDescription}
        confirmLabel={s.emptyTrash}
        onConfirm={() => {
          emptyTrash()
            .then(() => toast.success(s.trashEmptied))
            .catch((error) => toast.error(errorMessage(error)));
        }}
      />
    </div>
  );
}
