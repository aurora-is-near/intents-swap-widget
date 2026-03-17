import { useEffect, useState } from 'react';

function parseSizesToPixels(sizes: string | null): number {
  if (!sizes || sizes.trim().toLowerCase() === 'any') {
    return 0;
  }

  const match = sizes.trim().match(/^(\d+)\s*x\s*(\d+)$/i);

  if (!match) {
    return 0;
  }

  const w = parseInt(match[1] ?? '', 10);
  const h = parseInt(match[2] ?? '', 10);

  return Number.isFinite(w) && Number.isFinite(h) ? w * h : 0;
}

export function useFaviconUrl(): string | null {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const links =
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');

    if (links.length === 0) {
      setFaviconUrl(null);

      return;
    }

    const withSizes = Array.from(links)
      .map((link) => ({
        href: link.getAttribute('href'),
        pixels: parseSizesToPixels(link.getAttribute('sizes')),
      }))
      .filter((item): item is { href: string; pixels: number } => !!item.href);

    const sorted = [...withSizes].sort((a, b) => b.pixels - a.pixels);
    const best = sorted[0];

    if (!best) {
      setFaviconUrl(null);

      return;
    }

    try {
      const base = document.baseURI || window.location.href;
      const url = new URL(best.href, base);

      setFaviconUrl(url.pathname);
    } catch {
      const pathname = best.href.startsWith('/') ? best.href : `/${best.href}`;

      setFaviconUrl(pathname);
    }
  }, []);

  return faviconUrl;
}
