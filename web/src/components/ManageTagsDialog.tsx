import { useMutation, useQuery } from "convex/react";
import { CheckIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MAX_TAG_NAME_CHARS } from "@convex/lib/limits";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { strings } from "@/lib/strings";

const s = strings.tags;

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onDeleted: (id: Id<"tags">) => void };

export function ManageTagsDialog({ open, onOpenChange, onDeleted }: Props) {
  const tags = useQuery(api.tags.list);
  const remove = useMutation(api.tags.remove);
  const [editing, setEditing] = useState<Id<"tags"> | null>(null);
  const [deleting, setDeleting] = useState<{ _id: Id<"tags">; name: string } | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{strings.nav.manageTags}</DialogTitle>
          <DialogDescription>{s.manageDescription}</DialogDescription>
        </DialogHeader>
        {tags?.length === 0 && <p className="text-sm text-muted-foreground">{strings.nav.noTags}</p>}
        <ul className="-mx-2 flex max-h-96 flex-col overflow-y-auto">
          {tags?.map((tag) =>
            editing === tag._id ? (
              <RenameRow key={tag._id} tag={tag} onDone={() => setEditing(null)} />
            ) : (
              <li key={tag._id} className="flex h-10 items-center gap-2 rounded-md px-2 hover:bg-accent/50">
                <span className="flex-1 truncate text-sm">{tag.name}</span>
                <span className="text-xs text-muted-foreground">{s.noteCount(tag.count)}</span>
                <Button variant="ghost" size="icon-sm" aria-label={s.rename} onClick={() => setEditing(tag._id)}>
                  <PencilIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={s.delete} onClick={() => setDeleting(tag)}>
                  <Trash2Icon />
                </Button>
              </li>
            ),
          )}
        </ul>
        <ConfirmDialog
          open={deleting !== null}
          onOpenChange={(o) => !o && setDeleting(null)}
          title={s.deleteTitle(deleting?.name ?? "")}
          description={s.deleteDescription}
          confirmLabel={s.delete}
          onConfirm={() => {
            if (!deleting) return;
            const id = deleting._id;
            remove({ id })
              .then(() => onDeleted(id))
              .catch((error) => toast.error(errorMessage(error)));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function RenameRow({ tag, onDone }: { tag: Pick<Doc<"tags">, "_id" | "name">; onDone: () => void }) {
  const rename = useMutation(api.tags.rename);
  const [name, setName] = useState(tag.name);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (name.trim() !== tag.name) await rename({ id: tag._id, name });
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <li>
      <form onSubmit={submit} className="flex h-10 items-center gap-2 px-2">
        <Input
          autoFocus
          value={name}
          maxLength={MAX_TAG_NAME_CHARS}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), onDone())}
          aria-label={s.rename}
          className="h-8"
        />
        <Button type="submit" variant="ghost" size="icon-sm" aria-label={s.rename}>
          <CheckIcon />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={strings.cancel} onClick={onDone}>
          <XIcon />
        </Button>
      </form>
    </li>
  );
}
