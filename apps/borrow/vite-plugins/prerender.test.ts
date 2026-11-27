import { describe, expect, it } from 'vitest';

import {
  headTags,
  htmlFileFor,
  pageHtml,
  parseSiteUrl,
  robotsTxt,
  sitemapXml,
} from './prerender';

const HOME = {
  title: 'One click borrow · Aurora Borrow',
  description: 'Pick what you supply & what you borrow.',
};

describe('parseSiteUrl', () => {
  it('keeps the origin of an https URL, without a trailing slash', () => {
    expect(parseSiteUrl(' https://borrow.example.com/ ')).toBe(
      'https://borrow.example.com',
    );
  });

  it('is undefined while unset', () => {
    expect(parseSiteUrl(undefined)).toBeUndefined();
    expect(parseSiteUrl('')).toBeUndefined();
  });

  it.each(['http://borrow.example.com', 'https://example.com/borrow'])(
    'stops the build for %s',
    (value) => {
      expect(() => parseSiteUrl(value)).toThrow('SITE_URL');
    },
  );
});

describe('htmlFileFor', () => {
  it('writes / as index.html and other paths by name', () => {
    expect(htmlFileFor('/')).toBe('index.html');
    expect(htmlFileFor('/positions')).toBe('positions.html');
  });
});

describe('headTags', () => {
  it('writes the canonical, social tags and WebSite JSON-LD for the home page', () => {
    const tags = headTags(HOME, {
      path: '/',
      siteUrl: 'https://borrow.example.com',
    });

    expect(tags).toContain('<title>One click borrow · Aurora Borrow</title>');
    expect(tags).toContain(
      '<meta name="description" content="Pick what you supply &amp; what you borrow." />',
    );
    expect(tags).toContain(
      '<link rel="canonical" href="https://borrow.example.com/" />',
    );
    expect(tags).toContain(
      '<meta property="og:url" content="https://borrow.example.com/" />',
    );
    expect(tags).toContain('"@type":"WebSite"');
    expect(tags).not.toContain('noindex');
  });

  it('leaves out the canonical, og:url and JSON-LD without a site URL', () => {
    const tags = headTags(HOME, { path: '/', siteUrl: undefined });

    expect(tags).not.toContain('canonical');
    expect(tags).not.toContain('og:url');
    expect(tags).not.toContain('ld+json');
    expect(tags).toContain('<meta property="og:title"');
  });

  it('marks a noindex page and gives it no canonical', () => {
    const tags = headTags(
      { title: 'My positions · Aurora Borrow', noindex: true },
      { path: '/positions', siteUrl: 'https://borrow.example.com' },
    );

    expect(tags).toContain('<meta name="robots" content="noindex" />');
    expect(tags).not.toContain('canonical');
    expect(tags).not.toContain('ld+json');
  });
});

describe('robotsTxt', () => {
  it('allows every crawler and names the sitemap with a site URL', () => {
    expect(robotsTxt('https://borrow.example.com')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://borrow.example.com/sitemap.xml\n',
    );
    expect(robotsTxt(undefined)).toBe('User-agent: *\nAllow: /\n');
  });
});

describe('sitemapXml', () => {
  it('lists the given pages under the site URL', () => {
    expect(sitemapXml('https://borrow.example.com', ['/'])).toContain(
      '<url><loc>https://borrow.example.com/</loc></url>',
    );
  });
});

describe('pageHtml', () => {
  const template =
    '<head><title>Aurora Borrow</title></head><body><div id="root"></div></body>';

  it('swaps the title for the head tags and fills #root', () => {
    expect(
      pageHtml(template, { tags: '<title>T</title>', markup: '<p>$&</p>' }),
    ).toBe(
      '<head><title>T</title></head><body><div id="root"><p>$&</p></div></body>',
    );
  });

  it('stops when the template has no empty #root', () => {
    expect(() =>
      pageHtml('<title>x</title><div id="root">x</div>', {
        tags: '',
        markup: '',
      }),
    ).toThrow('empty <div id="root">');
  });
});
