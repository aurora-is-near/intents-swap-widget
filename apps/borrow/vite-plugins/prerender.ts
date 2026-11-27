import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

import type { PageHead } from '../src/pageHead';

type PrerenderModule = {
  PRERENDERED_PATHS: readonly string[];
  render: (path: string) => Promise<{ markup: string; head: PageHead }>;
};

const SITE_NAME = 'Aurora Borrow';
const ROOT_ELEMENT = '<div id="root"></div>';
const TITLE_ELEMENT = /<title>[^<]*<\/title>/;

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

/**
 * `SITE_URL` as an origin with no trailing slash, or `undefined` when unset.
 * Anything but an https URL stops the build: every canonical would be wrong.
 */
export const parseSiteUrl = (value: string | undefined) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const url = new URL(trimmed);

  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search) {
    throw new Error(
      `SITE_URL must be the site's https origin, such as https://borrow.example.com; got ${trimmed}.`,
    );
  }

  return url.origin;
};

/** `/` → `index.html`, `/positions` → `positions.html`. */
export const htmlFileFor = (path: string) =>
  path === '/' ? 'index.html' : `${path.slice(1)}.html`;

/**
 * A page's `<head>` tags: title, description, robots, social preview and,
 * with a site URL, the canonical and the home page's `WebSite` JSON-LD. A
 * `noindex` page gets no canonical.
 */
export const headTags = (
  head: PageHead,
  { path, siteUrl }: { path: string; siteUrl: string | undefined },
) => {
  const canonical =
    siteUrl && !head.noindex
      ? `${siteUrl}${path === '/' ? '/' : path}`
      : undefined;

  const meta = (attribute: 'name' | 'property', key: string, value: string) =>
    `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;

  const tags = [
    `<title>${escapeHtml(head.title)}</title>`,
    head.description && meta('name', 'description', head.description),
    head.noindex && meta('name', 'robots', 'noindex'),
    canonical && `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:title', head.title),
    head.description && meta('property', 'og:description', head.description),
    canonical && meta('property', 'og:url', canonical),
    siteUrl && meta('property', 'og:image', `${siteUrl}/apple-touch-icon.png`),
    meta('name', 'twitter:card', 'summary'),
    siteUrl &&
      path === '/' &&
      `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${siteUrl}/`,
      }).replaceAll('<', '\\u003c')}</script>`,
  ];

  return tags.filter(Boolean).join('\n    ');
};

/** Default-allow; names the sitemap when there is a site URL. */
export const robotsTxt = (siteUrl: string | undefined) =>
  [
    'User-agent: *',
    'Allow: /',
    ...(siteUrl ? ['', `Sitemap: ${siteUrl}/sitemap.xml`] : []),
    '',
  ].join('\n');

/** The indexable pages, as a sitemap. */
export const sitemapXml = (siteUrl: string, paths: readonly string[]) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');

/** The built `index.html` with a page's head tags and markup in it. */
export const pageHtml = (
  template: string,
  { tags, markup }: { tags: string; markup: string },
) => {
  if (!TITLE_ELEMENT.test(template) || !template.includes(ROOT_ELEMENT)) {
    throw new Error('index.html needs a <title> and an empty <div id="root">.');
  }

  return template
    .replace(TITLE_ELEMENT, () => tags)
    .replace(ROOT_ELEMENT, () => `<div id="root">${markup}</div>`);
};

/**
 * Writes each page of `src/prerender.tsx` as its own HTML file after the
 * build, so search and AI crawlers, which mostly do not run JavaScript, get
 * the page's content and head. Also writes `404.html` (Vercel answers unknown
 * paths with it, status 404), `robots.txt` and, with `SITE_URL`, the sitemap.
 * The app loads through Vite's own SSR loader, so it needs no second build.
 */
export const prerender = (siteUrlValue: string | undefined): Plugin => {
  const siteUrl = parseSiteUrl(siteUrlValue);
  let outDir = '';
  let root = '';
  let mode = '';
  let configFile: string | undefined;

  return {
    name: 'borrow-prerender',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      root = config.root;
      mode = config.mode;
      configFile = config.configFile;
    },
    async closeBundle() {
      // Loaded here, not at the top: the helpers above are unit-tested in jsdom.
      const { createServer } = await import('vite');
      const server = await createServer({
        root,
        mode,
        configFile,
        appType: 'custom',
        logLevel: 'error',
        server: { middlewareMode: true, hmr: false, ws: false },
      });

      try {
        const { PRERENDERED_PATHS, render } = (await server.ssrLoadModule(
          '/src/prerender.tsx',
        )) as PrerenderModule;

        const template = await readFile(join(outDir, 'index.html'), 'utf8');
        const pages = await Promise.all(
          PRERENDERED_PATHS.map(async (path) => ({
            path,
            ...(await render(path)),
          })),
        );

        await Promise.all(
          pages.map(({ path, markup, head }) =>
            writeFile(
              join(outDir, htmlFileFor(path)),
              pageHtml(template, {
                tags: headTags(head, { path, siteUrl }),
                markup,
              }),
            ),
          ),
        );

        // Unknown paths: status 404 from Vercel, then the app sends the
        // person to New loan.
        const { NOT_FOUND_HEAD } = (await server.ssrLoadModule(
          '/src/pageHead.ts',
        )) as { NOT_FOUND_HEAD: PageHead };

        await writeFile(
          join(outDir, '404.html'),
          pageHtml(template, {
            tags: headTags(NOT_FOUND_HEAD, { path: '/404', siteUrl }),
            markup: '',
          }),
        );
        await writeFile(join(outDir, 'robots.txt'), robotsTxt(siteUrl));

        if (siteUrl) {
          await writeFile(
            join(outDir, 'sitemap.xml'),
            sitemapXml(
              siteUrl,
              pages.filter(({ head }) => !head.noindex).map(({ path }) => path),
            ),
          );
        }
      } finally {
        await server.close();
      }
    },
  };
};
