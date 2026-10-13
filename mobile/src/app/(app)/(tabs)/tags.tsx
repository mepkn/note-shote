import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash2 } from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_TAGS } from "@convex/lib/limits";
import { CmpButton } from "@/components/cmp/cmp-button";
import { CmpConfirmDialog } from "@/components/cmp/cmp-confirm-dialog";
import { CmpPromptDialog } from "@/components/cmp/cmp-prompt-dialog";
import { CmpText } from "@/components/cmp/cmp-text";
import { errorMessage } from "@/lib/errors";
import { strings } from "@/lib/strings";

const t = strings.tags;

type TagRow = { _id: Id<"tags">; name: string; count: number };

export default function TagsScreen() {
  const tags = useQuery(api.tags.list);
  const create = useMutation(api.tags.create);
  const rename = useMutation(api.tags.rename);
  const remove = useMutation(api.tags.remove);

  // "new" while creating, a tag while renaming.
  const [editing, setEditing] = useState<TagRow | "new">();
  const [dialogError, setDialogError] = useState<string>();
  const [deleting, setDeleting] = useState<TagRow>();
  const [error, setError] = useState<string>();

  function openEditor(target: TagRow | "new") {
    setDialogError(undefined);
    setEditing(target);
  }

  async function save(name: string) {
    setDialogError(undefined);
    try {
      if (editing === "new") await create({ name });
      else if (editing) await rename({ id: editing._id, name });
      setEditing(undefined);
    } catch (e) {
      setDialogError(errorMessage(e));
    }
  }

  return (
    <View className="bg-background flex-1">
      {tags === undefined ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(tag) => tag._id}
          contentContainerClassName="mx-auto w-full max-w-2xl gap-2 p-4 pb-28"
          ListHeaderComponent={
            error ? <CmpText className="text-destructive pb-2 text-sm">{error}</CmpText> : null
          }
          ListEmptyComponent={
            <CmpText variant="muted" className="py-12 text-center">
              {t.emptyHint}
            </CmpText>
          }
          renderItem={({ item: tag }) => (
            <View className="border-border bg-card flex-row items-center gap-2 rounded-xl border py-2 pl-4 pr-2">
              <Pressable
                className="flex-1 py-1"
                accessibilityRole="link"
                onPress={() => router.push({ pathname: "/tag", params: { id: tag._id } })}>
                <CmpText className="text-base font-semibold" numberOfLines={1}>
                  {tag.name}
                </CmpText>
                <CmpText variant="muted" className="text-xs">
                  {t.count(tag.count)}
                </CmpText>
              </Pressable>
              <CmpButton
                variant="ghost"
                size="icon"
                icon={Pencil}
                label={t.rename}
                onPress={() => openEditor(tag)}
              />
              <CmpButton
                variant="ghost"
                size="icon"
                icon={Trash2}
                tone="destructive"
                label={strings.delete}
                onPress={() => setDeleting(tag)}
              />
            </View>
          )}
        />
      )}

      <View className="absolute bottom-6 right-6" pointerEvents="box-none">
        <CmpButton
          // Icon only; label stays as the accessibility label.
          size="icon"
          icon={Plus}
          label={t.newTag}
          disabled={tags !== undefined && tags.length >= MAX_TAGS}
          className="size-14 rounded-full shadow-lg shadow-black/20 sm:size-14"
          onPress={() => openEditor("new")}
        />
      </View>

      <CmpPromptDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        title={editing === "new" ? t.newTag : t.renameTitle}
        initialValue={editing === "new" ? "" : editing?.name}
        placeholder={t.newTagPlaceholder}
        error={dialogError}
        submitLabel={strings.save}
        cancelLabel={strings.cancel}
        onSubmit={(name) => void save(name)}
      />
      <CmpConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={deleting ? t.deleteTitle(deleting.name) : ""}
        description={t.deleteDescription}
        confirmLabel={strings.delete}
        cancelLabel={strings.cancel}
        destructive
        onConfirm={() => {
          if (!deleting) return;
          setError(undefined);
          remove({ id: deleting._id }).catch((e) => setError(errorMessage(e)));
        }}
      />
    </View>
  );
}
