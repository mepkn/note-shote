// A rough plain-text rendering of Markdown for list previews and fallback titles.
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[^\n]*\n?/g, "") // code fences
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
    .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/gm, "") // block markers
    .replace(/^\s*\|?[\s:-]+\|[\s|:-]*$/gm, "") // table separator rows
    .replace(/[*_~`|]+/g, "") // inline markers
    .replace(/\s+/g, " ")
    .trim();
}

export function preview(markdown: string, max = 140): string {
  const text = plainText(markdown.slice(0, max * 8));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// The first non-empty line of the body, used when a note has no title.
export function firstLine(markdown: string, max = 80): string {
  for (const line of markdown.split("\n")) {
    const text = plainText(line);
    if (text) return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }
  return "";
}
