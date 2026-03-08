import { mkdir, writeFile, rm, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const DEFAULT_BASE_URL = 'http://127.0.0.1:1313';
const DEFAULT_OUT_DIR = 'static/pdf';
const DEFAULT_MANIFEST_PATH = 'pdf-manifest/index.json';
const DEFAULT_CONTENT_DIR = 'content/posts';

function stripLeadingSlash(value) {
  return value.replace(/^\//, '');
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeBaseUrl(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function normalizeOptionalUrl(value) {
  if (!value) {
    return null;
  }

  return normalizeBaseUrl(value);
}

function buildArticleUrl(baseUrl, pagePathOrSlug) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const base = new URL(normalizedBaseUrl);
  const basePath = stripTrailingSlash(base.pathname);

  if (pagePathOrSlug.startsWith('/')) {
    const absolutePath = `${basePath}${pagePathOrSlug}`.replace(/\/+/g, '/');
    return new URL(stripLeadingSlash(absolutePath), normalizedBaseUrl).toString();
  }

  const articlePath = basePath.endsWith('/posts')
    ? `${basePath}/${pagePathOrSlug}/`
    : `${basePath}/posts/${pagePathOrSlug}/`;

  return new URL(stripLeadingSlash(articlePath), normalizedBaseUrl).toString();
}

function buildArticleUrlCandidates(baseUrl, pagePathOrSlug) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const base = new URL(normalizedBaseUrl);
  const basePath = stripTrailingSlash(base.pathname);
  const baseCandidates = [basePath, `${basePath}/textbook`, '/textbook', ''];
  const candidates = [];

  if (pagePathOrSlug.startsWith('/')) {
    for (const candidateBase of baseCandidates) {
      const absolutePath = `${candidateBase}${pagePathOrSlug}`.replace(/\/+/g, '/');
      candidates.push(new URL(stripLeadingSlash(absolutePath), normalizedBaseUrl).toString());
    }
  } else {
    for (const candidateBase of baseCandidates) {
      const articlePath = stripTrailingSlash(candidateBase).endsWith('/posts')
        ? `${candidateBase}/${pagePathOrSlug}/`
        : `${candidateBase}/posts/${pagePathOrSlug}/`;
      candidates.push(new URL(stripLeadingSlash(articlePath.replace(/\/+/g, '/')), normalizedBaseUrl).toString());
    }
  }

  return [...new Set(candidates)];
}

async function resolveArticleUrl(page, pagePathOrSlug, baseUrl) {
  const candidates = buildArticleUrlCandidates(baseUrl, pagePathOrSlug);

  for (const candidate of candidates) {
    const response = await page.goto(candidate, { waitUntil: 'networkidle' });
    const title = await page.title();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const is404 = response?.status() === 404 || /404/i.test(title) || /page not found/i.test(bodyText);

    if (!is404) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve article URL for ${pagePathOrSlug} from base ${baseUrl}`);
}

function parseArgs(argv) {
  const options = {
    slug: null,
    all: false,
    baseUrl: process.env.PDF_BASE_URL || DEFAULT_BASE_URL,
  publicBaseUrl: process.env.PDF_PUBLIC_BASE_URL || null,
    outDir: process.env.PDF_OUT_DIR || DEFAULT_OUT_DIR,
    manifestPath: process.env.PDF_MANIFEST_PATH || DEFAULT_MANIFEST_PATH,
    contentDir: process.env.PDF_CONTENT_DIR || DEFAULT_CONTENT_DIR,
    title: null,
    clean: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--slug') {
      options.slug = argv[i + 1];
      i += 1;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--base-url') {
      options.baseUrl = argv[i + 1];
      i += 1;
    } else if (arg === '--public-base-url') {
      options.publicBaseUrl = argv[i + 1];
      i += 1;
    } else if (arg === '--out-dir') {
      options.outDir = argv[i + 1];
      i += 1;
    } else if (arg === '--manifest-path') {
      options.manifestPath = argv[i + 1];
      i += 1;
    } else if (arg === '--content-dir') {
      options.contentDir = argv[i + 1];
      i += 1;
    } else if (arg === '--title') {
      options.title = argv[i + 1];
      i += 1;
    } else if (arg === '--clean') {
      options.clean = true;
    }
  }

  return options;
}

function usage() {
  console.error('Usage: npm run pdf:export -- (--slug <post-slug> | --all) [--base-url <url>] [--public-base-url <url>] [--out-dir <dir>] [--manifest-path <path>] [--content-dir <dir>] [--title <title>] [--clean]');
}

function parseFrontMatterValue(frontMatter, key) {
  const patterns = [
    new RegExp(`^${key}\\s*=\\s*['\"]([^'\"]+)['\"]`, 'm'),
    new RegExp(`^${key}\\s*=\\s*(true|false)`, 'm'),
  ];

  for (const pattern of patterns) {
    const match = frontMatter.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function parseFrontMatterString(frontMatter, key) {
  const match = frontMatter.match(new RegExp(`^${key}\\s*=\\s*(["'])(.*?)\\1$`, 'ms'));
  if (!match) {
    return null;
  }

  return match[2].replace(/\s+/g, ' ').trim();
}

async function collectContentFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const resolvedPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectContentFiles(resolvedPath));
      continue;
    }

    if (/\.(md|adoc)$/i.test(entry.name) && !entry.name.endsWith('.bak')) {
      files.push(resolvedPath);
    }
  }

  return files;
}

async function readLocalManifest(contentDir) {
  const root = path.resolve(process.cwd(), contentDir);
  const files = await collectContentFiles(root);
  const items = [];

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8');
    const match = source.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+/);
    if (!match) {
      continue;
    }

    const fileName = path.basename(filePath);
    if (fileName === '_index.md' || fileName === '_index.adoc') {
      continue;
    }

    const frontMatter = match[1];
    const draft = parseFrontMatterValue(frontMatter, 'draft');
    const disablePdfDownload = parseFrontMatterValue(frontMatter, 'disable_pdf_download');

    if (draft === 'true' || disablePdfDownload === 'true') {
      continue;
    }

    const frontMatterSlug = parseFrontMatterValue(frontMatter, 'slug');
    const fallbackSlug = path.basename(path.dirname(filePath)) === 'posts'
      ? path.basename(filePath, path.extname(filePath))
      : path.basename(path.dirname(filePath));
    const slug = frontMatterSlug || fallbackSlug;

  const title = parseFrontMatterString(frontMatter, 'title') || parseFrontMatterValue(frontMatter, 'title') || slug;
  const description = parseFrontMatterString(frontMatter, 'description') || parseFrontMatterString(frontMatter, 'summary') || parseFrontMatterValue(frontMatter, 'description') || parseFrontMatterValue(frontMatter, 'summary') || '';

    items.push({
      slug,
      title,
      description,
      permalink: `/posts/${slug}/`,
      source: path.relative(process.cwd(), filePath),
    });
  }

  return items;
}

async function fetchManifest(baseUrl, manifestPath) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const customPath = stripLeadingSlash(manifestPath);
  const basePath = new URL(normalizedBaseUrl).pathname;
  const sectionBasePath = stripLeadingSlash(basePath);
  const candidatePaths = [
    customPath,
    `${sectionBasePath}${sectionBasePath ? '/' : ''}${customPath}`,
    `${sectionBasePath}${sectionBasePath ? '/' : ''}posts/${customPath}`,
    'posts/pdf-manifest/index.json',
    'posts/index.pdf-manifest.json',
    'posts/pdf-manifest.json',
  ];

  const tried = new Set();

  for (const candidate of candidatePaths) {
    const cleaned = stripLeadingSlash(candidate);
    if (!cleaned || tried.has(cleaned)) {
      continue;
    }
    tried.add(cleaned);

    const manifestUrl = new URL(cleaned, normalizedBaseUrl);
    const response = await fetch(manifestUrl);

    if (response.ok) {
      return response.json();
    }
  }

  throw new Error(`Unable to fetch PDF manifest from ${Array.from(tried, (entry) => new URL(entry, normalizedBaseUrl).toString()).join(', ')}`);
}

async function preparePageForPdf(page, job, options) {
  const canonicalBaseUrl = normalizeOptionalUrl(options.publicBaseUrl);
  const sourceBaseUrl = normalizeBaseUrl(options.baseUrl);
  const displaySourceUrl = canonicalBaseUrl
    ? buildArticleUrl(canonicalBaseUrl, job.pagePathOrSlug)
    : job.articleUrl;

  await page.evaluate(({ sourceBaseUrlValue, canonicalBaseUrlValue, displaySourceUrlValue, title, description }) => {
    const sourceBase = sourceBaseUrlValue ? new URL(sourceBaseUrlValue) : null;
    const canonicalBase = canonicalBaseUrlValue ? new URL(canonicalBaseUrlValue) : null;

    if (sourceBase && canonicalBase) {
      for (const anchor of document.querySelectorAll('a[href]')) {
        const rawHref = anchor.getAttribute('href');
        if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
          continue;
        }

        try {
          const resolved = new URL(rawHref, window.location.href);
          if (resolved.origin === sourceBase.origin) {
            const canonical = new URL(resolved.pathname + resolved.search + resolved.hash, canonicalBase);
            anchor.href = canonical.toString();
          }
        } catch {
          // Ignore malformed URLs.
        }
      }
    }

    document.documentElement.setAttribute('data-pdf-source-url', displaySourceUrlValue);
    document.documentElement.setAttribute('data-pdf-link-mode', canonicalBase ? 'public' : 'local');

    const contentRoot = document.querySelector('#content');
    const article = contentRoot?.querySelector('article');
    if (!contentRoot || !article) {
      return;
    }

    let h2Index = 0;
    let h3Index = 0;
    const tocEntries = Array.from(article.querySelectorAll('section[id] > h2, section[id] h3')).map((heading, index) => {
      const level = heading.tagName.toLowerCase();
      const section = heading.closest('section[id]');
      if (!section) {
        return null;
      }

      const anchorId = heading.id || `${section.id}-pdf-${level}-${index + 1}`;
      heading.id = anchorId;

      if (level === 'h2') {
        h2Index += 1;
        h3Index = 0;
      } else if (level === 'h3') {
        h3Index += 1;
      }

      return {
        level,
        text: heading.textContent?.trim() || '',
        href: `#${anchorId}`,
        number: level === 'h2' ? `${h2Index}.` : `${h2Index}.${h3Index}`,
      };
    }).filter((entry) => entry && entry.text);

    if (!contentRoot.querySelector('.pdf-frontmatter')) {
      const frontMatter = document.createElement('div');
      frontMatter.className = 'pdf-frontmatter';

      const titlePage = document.createElement('section');
      titlePage.className = 'pdf-title-page';

      const titleEl = document.createElement('h1');
      titleEl.className = 'pdf-title-page__title';
      titleEl.textContent = title;
      titlePage.appendChild(titleEl);

      if (description) {
        const descEl = document.createElement('p');
        descEl.className = 'pdf-title-page__description';
        descEl.textContent = description;
        titlePage.appendChild(descEl);
      }

      const sourceEl = document.createElement('p');
      sourceEl.className = 'pdf-title-page__source';
      sourceEl.textContent = displaySourceUrlValue;
      titlePage.appendChild(sourceEl);

      frontMatter.appendChild(titlePage);

      if (tocEntries.length) {
        const tocSection = document.createElement('section');
        tocSection.className = 'pdf-toc';

        const tocTitle = document.createElement('h2');
        tocTitle.className = 'pdf-toc__title';
        tocTitle.textContent = 'Contents';
        tocSection.appendChild(tocTitle);

        const tocList = document.createElement('ol');
        tocList.className = 'pdf-toc__list';

        for (const entry of tocEntries) {
          const item = document.createElement('li');
          item.className = `pdf-toc__item pdf-toc__item--${entry.level}`;

          const link = document.createElement('a');
          link.className = 'pdf-toc__link';
          link.href = entry.href;

          const number = document.createElement('span');
          number.className = 'pdf-toc__number';
          number.textContent = entry.number;

          const text = document.createElement('span');
          text.className = 'pdf-toc__text';
          text.textContent = entry.text;

          link.appendChild(number);
          link.appendChild(text);
          item.appendChild(link);
          tocList.appendChild(item);
        }

        tocSection.appendChild(tocList);
        frontMatter.appendChild(tocSection);
      }

      const firstContentSection = contentRoot.firstElementChild;
      if (firstContentSection) {
        contentRoot.insertBefore(frontMatter, firstContentSection);
      } else {
        contentRoot.appendChild(frontMatter);
      }
    }
  }, {
    sourceBaseUrlValue: sourceBaseUrl,
    canonicalBaseUrlValue: canonicalBaseUrl,
    displaySourceUrlValue: displaySourceUrl,
    title: job.title,
    description: job.description || '',
  });

  return displaySourceUrl;
}

async function exportOne(page, { title, articleUrl, outputPath, displaySourceUrl }) {
  await page.emulateMedia({ media: 'print' });

  const resolvedTitle = title || (await page.title()).replace(/\s+-\s+Textbook$/, '');
  const footerText = `Source: ${displaySourceUrl || articleUrl}`;

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '16mm',
      right: '14mm',
      bottom: '18mm',
      left: '14mm',
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width:100%; font-size:9px; padding:0 12mm; color:#666; text-align:center;">
        ${resolvedTitle}
      </div>
    `,
    footerTemplate: `
      <div style="width:100%; font-size:8px; padding:0 12mm; color:#666; display:flex; justify-content:space-between;">
        <span>${footerText}</span>
        <span><span class="pageNumber"></span>/<span class="totalPages"></span></span>
      </div>
    `,
  });
}

const options = parseArgs(process.argv.slice(2));

if (!options.slug && !options.all) {
  usage();
  process.exit(1);
}

const outputDir = path.resolve(process.cwd(), options.outDir);
await mkdir(outputDir, { recursive: true });

if (options.clean) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
}

const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  const jobs = [];

  if (options.all) {
    let manifest;

    try {
      manifest = await fetchManifest(options.baseUrl, options.manifestPath);
    } catch (error) {
      manifest = await readLocalManifest(options.contentDir);
      console.warn(`${error.message}. Falling back to local content scan (${options.contentDir}).`);
    }

    for (const item of manifest) {
      const pagePathOrSlug = item.permalink || item.slug;
      jobs.push({
        slug: item.slug,
        title: item.title,
        description: item.description || '',
        pagePathOrSlug,
        outputPath: path.join(outputDir, `${item.slug}.pdf`),
      });
    }
  } else {
    jobs.push({
      slug: options.slug,
      title: options.title,
      description: '',
      pagePathOrSlug: options.slug,
      outputPath: path.join(outputDir, `${options.slug}.pdf`),
    });
  }

  for (const job of jobs) {
    job.articleUrl = await resolveArticleUrl(page, job.pagePathOrSlug, options.baseUrl);
    job.displaySourceUrl = await preparePageForPdf(page, job, options);
    await exportOne(page, job);
    console.log(`Created ${job.outputPath}`);
    console.log(`Serve from /pdf/${job.slug}.pdf`);
  }

  await writeFile(path.join(outputDir, '.gitkeep'), '', { flag: 'a' });
} finally {
  await browser.close();
}