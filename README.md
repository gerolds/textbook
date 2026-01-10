<<<<<<< HEAD
# Textbook
Articles, Essays, Summaries
=======
# Personal Essay Site (Hugo + Book)

This is a Hugo-powered essay journal styled with the [Book](https://github.com/alex-shpak/hugo-book) theme. The layout emulates a tactile book/table-of-contents experience while keeping the writing front and center.

## Requirements

- [Hugo Extended](https://gohugo.io/getting-started/installing/) v0.153 or newer (`hugo version` should include `extended`).
- Git (optional) for pulling Book updates.

## Local development

```bash
# start a live-reloading dev server
hugo server --buildDrafts --disableFastRender
```

Visit <http://localhost:1313> to preview the essays. Content lives under `content/` with:

- `_index.md` – homepage intro
- `about/` – about page
- `posts/` – individual essays (see the two sample posts for structure)

Create a new essay from the provided archetype:

```bash
hugo new --kind essay posts/my-new-essay.md
```

## Production build

```bash
hugo --minify
```

The publish-ready HTML, CSS, and assets land in `public/`.

## Deploying to classic hosting (FTP/rsync)

Most shared hosts (HostEurope, DreamHost, NearlyFreeSpeech, etc.) provide either FTP/SFTP or SSH access. Upload the generated `public/` directory to the document root (often `public_html/` or `www/`). Examples:

```bash
# Using rsync over SSH (best for hosts that offer SSH)
rsync -avz --delete public/ user@examplehost.com:/home/user/public_html/

# Using lftp mirror for FTP-only plans
lftp -u USERNAME,FTP_PASSWORD ftp://ftp.examplehost.com -e "mirror -R public/ public_html/; quit"
```

Tips:

1. Update `baseURL` in `hugo.toml` to your real domain before running the production build.
2. If your host requires everything inside `~/www/`, ensure the trailing slash (`public/`) is included so only the contents are synced.
3. Repeat `hugo --minify` + upload whenever you add or edit essays.

## Customizing the site

- **Site metadata:** edit `hugo.toml` (title, description, menus, email address).
- **Theme tweaks:** adjust Book-specific `[params]` such as `BookTheme`, `BookSection`, and `BookSearch`, or add overrides in `layouts/`.
- **Styling:** drop custom CSS inside `assets/css/extended/` and enable `customCSS` in `hugo.toml` if desired.

## Managing themes

The Hugo themes now live under `themes/` as git submodules. After cloning the repo, initialize them with:

```bash
git submodule update --init --recursive
```

To pull in upstream fixes for every theme in one go, run:

```bash
git submodule update --remote --merge
```

You can still enter any individual theme (e.g., `themes/book`) and run `git pull` if you want to inspect or edit a single submodule before committing.

## Updating Book

```bash
cd themes/book
git pull
```

Commit the theme update (or vendor the folder) so deployments see the latest Book styles.

## Classic hosting checklist

- ✔️ Run `hugo --minify`
- ✔️ Upload/sync `public/`
- ✔️ Purge any caching your host applies
- ✔️ Verify links + RSS feed at `/index.xml`

Once those steps succeed, your essay site is live.
>>>>>>> cdcb079 (Add essay "When the Funnel Eats the Work" exploring the impact of the attention economy on creative work and discourse)
