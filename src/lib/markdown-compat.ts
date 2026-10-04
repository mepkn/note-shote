// The Android rich editor (EnrichedMarkdownTextInput) only models paragraphs,
// H1–H6, single-line nested lists and bold/italic/underline/strike/links.
// Anything else is flattened when a note is loaded into it and saved, so such
// notes are edited as raw Markdown instead. See README → "Editor round-trip".

type Rule = { name: string; test: RegExp };

const RULES: Rule[] = [
  { name: "fencedCode", test: /^\s{0,3}(```|~~~)/m },
  { name: "indentedCode", test: /(^|\n\s*\n)( {4}|\t)\S/ },
  // Header row, then a delimiter row of cells like "-", ":--", "---:" (GFM allows one dash).
  { name: "table", test: /^[^\n]*\|[^\n]*\n\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/m },
  { name: "blockquote", test: /^\s{0,3}>/m },
  { name: "taskList", test: /^\s*[-*+]\s+\[[ xX]\]\s/m },
  { name: "thematicBreak", test: /^\s{0,3}([-*_])(\s*\1){2,}\s*$/m },
  { name: "image", test: /!\[[^\]]*\]\([^)]*\)/ },
  { name: "inlineCode", test: /`[^`\n]+`/ },
  { name: "html", test: /<\/?[a-zA-Z][^>\n]*>/ },
  // The editor drops backslash escapes. (`_x_` is underline everywhere: the
  // viewer is rendered with md4c's underline flag to match the editor.)
  { name: "escape", test: /\\[\\`*_{}[\]()#+\-.!|~>]/ },
  { name: "setextHeading", test: /^[^\n]+\n\s{0,3}(=+|-+)\s*$/m },
];

// A list item followed by an indented continuation paragraph (blank line, then
// indented text that isn't itself a list item).
const LOOSE_LIST_ITEM = /^\s*([-*+]|\d+[.)])\s+.+\n\s*\n( {2,}|\t)(?![-*+]\s|\d+[.)]\s)\S/m;

export function unsupportedFeatures(markdown: string): string[] {
  const found = RULES.filter((r) => r.test.test(markdown)).map((r) => r.name);
  if (LOOSE_LIST_ITEM.test(markdown)) found.push("multiParagraphListItem");
  return found;
}

export function canEditRich(markdown: string): boolean {
  return unsupportedFeatures(markdown).length === 0;
}
