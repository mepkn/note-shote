import { describe, expect, test } from "vitest";
import { canEditRich, unsupportedFeatures } from "./markdown-compat";

describe("canEditRich", () => {
  test("accepts what the Android editor round-trips", () => {
    const md = [
      "# Title",
      "",
      "Some **bold**, *italic*, ~~gone~~ and a [link](https://example.com).",
      "",
      "- one",
      "   - nested",
      "- two",
      "",
      "1. first",
      "2. second",
      "",
      "### Small heading",
      "snake_case_words stay fine, _underline_ too",
    ].join("\n");
    expect(unsupportedFeatures(md)).toEqual([]);
  });

  test.each([
    ["fencedCode", "```ts\nconst a = 1;\n```"],
    ["table", "| a | b |\n| --- | --- |\n| 1 | 2 |"],
    ["table", "| a | b |\n| - | - |\n| 1 | 2 |"],
    ["table", "a | b\n:-|-:\n1 | 2"],
    ["blockquote", "> quoted"],
    ["taskList", "- [ ] todo\n- [x] done"],
    ["thematicBreak", "above\n\n---\n\nbelow"],
    ["image", "![alt](https://example.com/a.png)"],
    ["inlineCode", "run `npm test` now"],
    ["html", "<details>hi</details>"],
    ["escape", "literal \\*stars\\*"],
    ["multiParagraphListItem", "- item\n\n  continued paragraph"],
    ["indentedCode", "para\n\n    code line"],
  ])("rejects %s", (name, md) => {
    expect(unsupportedFeatures(md)).toContain(name);
    expect(canEditRich(md)).toBe(false);
  });
});
