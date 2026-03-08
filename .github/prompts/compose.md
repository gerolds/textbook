# Compose — Turn raw notes into a textbook article

You receive raw material: scattered notes, bullet points, a sketch, a thesis fragment, a brain-dump, a voice memo transcript, or any combination. Your job is to produce a coherent, publication-ready article that preserves every idea in the source and makes it accessible to a reader who does not share the author's context.

The article is an archival artifact. It serves two audiences:

1. **The author, later.** Months or years from now they will re-encounter this piece and need to recover not just what they thought but *why* they thought it — the reasoning, the context, the adjacent problems that made the idea feel important.
2. **A second reader.** Someone competent and curious who does not work in the author's domain, has never had this conversation, and needs enough context to follow the argument and decide whether to engage further.

---

## Constraints on your output

- **Every idea in the output must trace to the source material.** You may restructure, reorder, and expand — but you may not invent claims, examples, arguments, or positions the author did not provide or clearly imply. If you infer context (see §2), mark what you inferred.
- **Write plainly.** Short sentences. Concrete nouns. Active verbs. No prestige vocabulary (see `copy-edit.md` §1 kill-list). The reader should never feel the prose is performing.
- **Match the author's register.** Read the notes for tone — blunt, formal, conversational, technical. Write in that voice, not a better one. If the notes are too fragmentary to establish a voice, default to direct and informal.
- **Do not pad.** Every paragraph must contain at least one thing the reader didn't know from the previous paragraph. If a section exists only to transition, delete it and let the heading do the work.
- **Do not smooth over uncertainty.** If the notes contain a tension, a contradiction, or an unresolved question, present it as such. Do not resolve what the author left open.

---

## Process

### §1 — Extract the thesis

Read all source material. Identify the central idea — the thing the notes are *about*. State it in one or two sentences. This becomes the article's lede and the test for everything that follows: every section must either advance this idea, provide necessary context for it, or honestly complicate it.

If the notes contain no identifiable central idea — just a collection with no throughline — **stop and return only:**

```markdown
[//]: # "ABORT: no central idea found. These notes may need a thesis before they become an article. Candidates: [list the 2-3 strongest threads you see]."
```

### §2 — Reconstruct the missing context

The author's notes assume their own context. Read between the lines: what does the author know that the reader doesn't? What domain, experience, prior conversations, or technical background makes these notes make sense?

Write that context into the article — but mark every significant inference so the author can verify it:

```markdown
[//]: # "INFER: added context about [topic] — is this what you meant?"
```

Rules for context reconstruction:

- **Use web search** to verify any factual claims you reconstruct. If you can confirm them, include them without annotation. If you cannot, annotate with `VERIFY`.
- Include only context a reader *needs* to follow the argument. Do not write a background survey.
- When the author's experience or domain knowledge is the context, say so directly: "This comes from experience with X" or "In the context of Y, this means…" — don't pretend the claim is universal.

### §3 — Organise the structure

Arrange the material into sections. Use the following as a default skeleton — deviate when the material demands it:

1. **Opening.** The central idea stated plainly. No preamble. No "In today's world." Start with the claim or the observation.
2. **Context.** What a reader needs to know to follow. Only what's necessary.
3. **Body.** The argument, observation, or framework — as many sections as the material requires. Each section should have a heading that tells the reader what it says, not what it's about. ("Systems teams struggle with feel" not "On the topic of team capabilities.")
4. **Complications.** Tensions, exceptions, open questions the author raised or that the material implies. Do not manufacture these, but do not suppress them either.
5. **Resources.** (See §5.)
6. **Further reading.** (See §6.)

### §4 — Write the article

Produce the full article in markdown with Hugo front-matter:

```toml
+++
title = ''
date = {{ current ISO date }}
description = ''
summary = ''
tags = []
categories = ['Essays']
showToc = true
draft = true
slug = ''
cover = { image = '', alt = '', caption = '' }
+++
```

Front-matter rules:

- `title`: derived from the central idea. Short. No subtitle after a colon unless genuinely needed.
- `description`: one sentence — the thesis restated for metadata. Under 160 characters.
- `summary`: two or three sentences — enough for a reader scanning a list to decide whether to click. Written for the reader, not for SEO.
- `tags`: lowercase, drawn from the material's actual topics. Prefer existing tags in the site when the fit is genuine.
- `draft = true` always. The author publishes, not you.
- `slug`: short, lowercase, hyphenated. Derived from the title.

Writing rules:

- Use `##` for top-level sections, `###` for subsections. No `#` — Hugo supplies it from the title.
- Use `---` between major sections only when a hard break serves the reading rhythm.
- Bold for emphasis. Italic for terms being introduced. No underline.
- Code blocks for anything that is literally code or a literal command.
- Block quotes (`>`) only for actual quotations.
- If the notes contain a list that works as a list, keep it as a list. If a list is really a sequence of paragraphs, write paragraphs.

### §5 — Resources section

If the notes reference, imply, or depend on specific resources — books, papers, talks, tools, projects, people's work — collect them into a **Resources** section at the end, before Further Reading.

Format each resource as:

```markdown
- **[Resource name](URL)** — One sentence: what it contributes to the argument or context of this article.
```

Rules:

- **Use web search** to find correct URLs. If you can't find one, omit the link and annotate: `[//]: # "VERIFY: could not find URL for [resource]"`.
- Only include resources that are relevant to *this* article's argument. Do not compile a general reading list.
- The one-sentence description must say what the resource contributes, not what it is. "Describes the concept of institutional fitness" not "A book about organizations."

### §6 — Further reading

Add a **Further Reading** section for resources the author and a secondary reader might want to explore — adjacent ideas, deeper treatments, contrasting positions, foundational work the article builds on but doesn't explain.

Format identically to Resources. The distinction:

- **Resources** are things the article *uses or depends on*.
- **Further Reading** is things the reader might want *next*.

If the notes don't suggest any further reading and you can't identify any from the material, omit this section.

---

## Quality passes

After writing the article, apply two editorial passes using the standards from the companion prompts. Do not run them as separate operations — internalise their standards and apply them as you write, then verify on re-read.

**Pass 1 — Copy-edit (from `copy-edit.md`).**
Check for: dead vocabulary, throat clearing, flattery, mechanical structure, fake reasoning, emotional manipulation, padding, flat voice, insider jargon, fear-hedging, run-on thinking, tangents, score-settling, overcompression. Fix in place.

**Pass 2 — Rewrite integrity (from `rewrite.md`).**
Check for: unsupported specifics (search the web), unearned confidence, fabricated structure, scope inflation, empty passages, voice breaks, intent misalignment, insider jargon, fear-hedging, run-on thinking, tangents, score-settling, overcompression. Fix or annotate as appropriate.

---

## Output

Return:

1. The complete article in markdown, ready to save as a Hugo content file.
2. A summary block at the end:

```markdown
[//]: # "COMPOSE SUMMARY: word count, sections, N inferences marked INFER, N facts verified via search, N unresolved VERIFY annotations, N resources, N further reading. Central idea: …"
```

**Annotations that remain in the output:**

- `INFER` — you added context the author didn't explicitly state. They must confirm.
- `VERIFY` — a claim you could not confirm. The author must source or remove.
- `REFUTE` — you searched and the claim is wrong. State what you found.
- `ABORT` — no central idea. Cannot proceed.
