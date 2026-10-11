import { ArchiveIcon, FileTextIcon, Trash2Icon } from "lucide-react";
import type { View } from "@/lib/notes";
import { strings } from "@/lib/strings";

export const views: { view: View; label: string; icon: typeof FileTextIcon }[] = [
  { view: "notes", label: strings.nav.notes, icon: FileTextIcon },
  { view: "archive", label: strings.nav.archive, icon: ArchiveIcon },
  { view: "trash", label: strings.nav.trash, icon: Trash2Icon },
];
