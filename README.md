# Prompt Master

A Claude Code mod that rewrites a rough draft prompt into a clear, specific one before you send it.

- **✨ Prompt Master button** in the band above the prompt box (terminal and desktop): click it and your draft is replaced with the rewrite. Review, edit, then press Enter yourself — it never sends on its own.
- **Undo** puts your original draft back (until you send).
- **`/pm <rough prompt>`** does the same from a slash command, and works on surfaces without the button (mobile).

The rewrite keeps your intent, never invents requirements, and ends with an "Ask me before assuming: …" line when something essential is ambiguous. Each rewrite is one Sonnet call at low effort.

## Install

At the prompt of a terminal session:

```
/plugin install prompt-master --marketplace joelmklein-sketch/prompt-master
```

From a shell:

```bash
claude plugin install prompt-master --marketplace joelmklein-sketch/prompt-master
```
