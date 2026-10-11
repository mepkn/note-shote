import { useMutation, useQuery } from "convex/react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_TAG_NAME_CHARS } from "@convex/lib/limits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

type Props = {
  noteId: Id<"notes">;
  tagIds: Id<"tags">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Toggle a note's tags, or create a new one (added to the note straight away). */
export function NoteTagsDialog({ noteId, tagIds, open, onOpenChange }: Props) {
  const tags = useQuery(api.tags.list);
  const setTags = useMutation(api.notes.setTags);
  const createTag = useMutation(api.tags.create);
  const [name, setName] = useState("");

  const save = (next: Id<"tags">[]) =>
    setTags({ id: noteId, tagIds: next }).catch((error) => toast.error(errorMessage(error)));

  async function add(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = tags?.find((t) => t.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase());
    try {
      const id = existing?._id ?? (await createTag({ name: trimmed }));
      if (!tagIds.includes(id)) await setTags({ id: noteId, tagIds: [...tagIds, id] });
      setName("");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{strings.editor.tags}</DialogTitle>
        </DialogHeader>
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={strings.tags.newTagPlaceholder}
            maxLength={MAX_TAG_NAME_CHARS}
            aria-label={strings.tags.newTag}
          />
          <Button type="submit" variant="outline" disabled={!name.trim()}>
            <PlusIcon /> {strings.tags.add}
          </Button>
        </form>
        <ul className="-mx-2 flex max-h-72 flex-col overflow-y-auto">
          {tags?.map((tag) => {
            const on = tagIds.includes(tag._id);
            return (
              <li key={tag._id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => void save(on ? tagIds.filter((id) => id !== tag._id) : [...tagIds, tag._id])}
                  className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-accent"
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded border",
                      on && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {on && <CheckIcon className="size-3" />}
                  </span>
                  <span className="flex-1 truncate">{tag.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
