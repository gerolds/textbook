# Textbook

Articles, Essays, Summaries

## Publishing (GitHub Pages)

This site is deployed with GitHub Actions to <https://gerolds.github.io/textbook/>.

### AsciiDoc support

Some posts are written in AsciiDoc (`.adoc`). Hugo requires the external **Asciidoctor** binary to render these files.

- macOS (Homebrew): install `asciidoctor` (and Ruby if needed)
- CI: the GitHub Action installs Asciidoctor automatically

## PDF exports

The cleanest path for this site is: let Hugo render the article HTML, add print-specific CSS, and use a headless browser to save the rendered page as PDF.

Why this is the best fit here:

- it preserves the site's actual typography and layout
- it works for both Markdown and AsciiDoc posts
- it avoids maintaining a second document pipeline like Pandoc/LaTeX
- it can publish static PDFs at predictable URLs like `/pdf/<slug>.pdf`

### One-time setup

- install Node.js if it isn't already available
- run `npm install`
- install the Playwright browser used for PDF generation with `npx playwright install chromium`

### Export a post to PDF

1. Start the Hugo dev server.
2. In another shell, export the post by slug.

Example for `content/posts/what-a-game-can-be.md`:

```zsh
hugo server
npm run pdf:export -- --slug what-a-game-can-be
```

That writes the PDF to `static/pdf/what-a-game-can-be.pdf`, which Hugo serves at `/pdf/what-a-game-can-be.pdf`.

### Export all eligible posts locally

The exporter can read a Hugo-generated manifest and build PDFs for every published post that does not opt out.

```zsh
hugo server
npm run pdf:export:all -- --clean
```

By default that writes PDFs to `static/pdf/` locally.

The batch exporter first tries to discover the manifest from the running Hugo site automatically. If that custom output route is unavailable locally, it falls back to scanning `content/posts/` for published posts. If your local server is on a non-default port or base path, pass `--base-url`.

Local PDFs are generated from your local Hugo server, so they do not rewrite links to a public domain unless you pass `--public-base-url`. Without that flag, the exporter keeps local PDFs readable by avoiding raw localhost URL tails in print.

### Automated deploy-time PDF upsert

The GitHub Pages workflow now generates PDFs automatically during the build job.

- Hugo serves the site locally in CI.
- Hugo exposes a JSON manifest of PDF-eligible posts as a custom section output.
- The local exporter and CI readiness check both try the likely manifest routes automatically.
- CI passes the GitHub Pages base URL into the exporter so links inside published PDFs point to the live site instead of localhost.
- The export script renders each listed post to a temporary CI directory.
- After the normal production `hugo` build, the workflow copies those PDFs into `public/pdf/` before uploading the Pages artifact.

This means you do **not** need to commit generated PDFs to the repository for production publishing.

### Notes

- The post template now shows a `Download PDF` link automatically for pages in `content/posts/`.
- If a post should not show that link, set `disable_pdf_download: true` in its front matter.
- Draft posts are excluded from automated PDF generation.
- Exported PDFs include a generated title page using front matter `title` plus `description` or `summary` when available, followed by a PDF-specific table of contents generated from article headings.
- For one-off local exports, `npm run pdf:export -- --slug <slug>` still works.
