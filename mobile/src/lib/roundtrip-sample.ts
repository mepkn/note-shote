// Every GFM feature, for the Android editor round-trip check (/roundtrip).
export const ROUNDTRIP_SAMPLE = `# Heading 1
## Heading 2
### Heading 3

Plain paragraph with **bold**, *italic*, _underline_, ~~strike~~, ***bold italic*** and a [link](https://example.com).
Second line of the same paragraph.

- bullet one
- bullet two
   - nested bullet
1. first
2. second
   1. nested number

- loose item

  continuation paragraph

> a blockquote

\`inline code\` and an escaped \\*star\\*

\`\`\`ts
const a = 1;
\`\`\`

| a | b |
| --- | --- |
| 1 | 2 |

- [ ] task
- [x] done

---

![image](https://example.com/a.png)
`;
