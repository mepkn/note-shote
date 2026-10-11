import { useMutation, useQuery } from "convex/react";
import { Loader2Icon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ManageTagsDialog } from "@/components/ManageTagsDialog";
import { NoteEditor } from "@/components/NoteEditor";
import { NoteList } from "@/components/NoteList";
import { Sidebar } from "@/components/Sidebar";
import { SourceMenu } from "@/components/SourceMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHash } from "@/hooks/use-hash";
import { errorMessage } from "@/lib/errors";
import type { Source } from "@/lib/notes";
import { strings } from "@/lib/strings";
import { views } from "@/lib/views";
import { cn } from "@/lib/utils";

const s = strings.list;

/**
 * Three panes from 768px wide: sidebar, list, open note. Phones show the list, or the
 * open note full-screen. The open note's id is the URL hash.
 */
export function NotesPage() {
  const [source, setSource] = useState<Source>({ kind: "view", view: "notes" });
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const [noteId, setNoteId] = useHash();
  const [manageTags, setManageTags] = useState(false);
  const [creating, setCreating] = useState(false);
  const create = useMutation(api.notes.create);
  const tags = useQuery(api.tags.list);

  const select = (next: Source) => {
    setSource(next);
    setSearchInput("");
  };

  const sourceLabel = searchInput.trim()
    ? strings.nav.notes
    : source.kind === "tag"
      ? (tags?.find((t) => t._id === source.tagId)?.name ?? strings.nav.tags)
      : views.find((v) => v.view === source.view)!.label;

  async function newNote() {
    setCreating(true);
    try {
      const tagIds = source.kind === "tag" ? [source.tagId] : [];
      const { _id } = await create({ tagIds });
      if (source.kind === "view" && source.view !== "notes") select({ kind: "view", view: "notes" });
      setNoteId(_id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:block">
        <Sidebar
          source={source}
          searching={search.length > 0}
          onSelect={select}
          onManageTags={() => setManageTags(true)}
        />
      </aside>

      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col md:w-80 md:flex-none md:border-r lg:w-96",
          noteId && "hidden md:flex",
        )}
      >
        <div className="flex shrink-0 flex-col gap-2 border-b p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 md:hidden">
              <SourceMenu label={sourceLabel} onSelect={select} onManageTags={() => setManageTags(true)} />
            </div>
            <h2 className="hidden truncate font-semibold md:block">{sourceLabel}</h2>
            <Button size="sm" onClick={() => void newNote()} disabled={creating}>
              {creating ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              {s.newNote}
            </Button>
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={s.search}
              aria-label={s.search}
              className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                aria-label={s.clearSearch}
                onClick={() => setSearchInput("")}
              >
                <XIcon />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NoteList source={source} search={search} selectedId={noteId} onOpen={setNoteId} />
        </div>
      </section>

      <section className={cn("min-w-0 flex-1 flex-col", noteId ? "flex" : "hidden md:flex")}>
        {noteId ? (
          <ErrorBoundary
            key={noteId}
            fallback={(error) => (
              <Placeholder>
                {errorMessage(error) === strings.somethingWentWrong ? strings.errors.noteNotFound : errorMessage(error)}
                <Button variant="outline" size="sm" onClick={() => setNoteId("")}>
                  {strings.back}
                </Button>
              </Placeholder>
            )}
          >
            <NoteEditor
              id={noteId as Id<"notes">}
              onBack={() => setNoteId("")}
              onClosed={() => setNoteId("")}
              onTag={(tagId) => select({ kind: "tag", tagId })}
            />
          </ErrorBoundary>
        ) : (
          <Placeholder>{strings.editor.nothingSelected}</Placeholder>
        )}
      </section>

      <ManageTagsDialog
        open={manageTags}
        onOpenChange={setManageTags}
        onDeleted={(id) => {
          if (source.kind === "tag" && source.tagId === id) select({ kind: "view", view: "notes" });
        }}
      />
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
