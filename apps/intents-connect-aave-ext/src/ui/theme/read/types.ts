import type { ThemeSeed } from '../derive';

/** What a site adapter knows about its page, when the reader needs help. */
export type PageThemeHints = {
  /** Selectors for the page's own components, tried before the guesses. */
  selectors?: {
    /** Its primary button: the accent and the CTA's text. */
    primaryButton?: string;
    /** Its buttons: corner radius. */
    button?: string;
    /** Its cards: surface color and corner radius. */
    card?: string;
  };
  /** Seed values to use as they are, whatever the page shows. */
  pin?: Partial<ThemeSeed>;
};

/** Where each seed value came from, e.g. `pin`, `mui`, `computed:buttons(3)`. */
export type ThemeEvidence = Partial<Record<keyof ThemeSeed, string>>;

/** A seed read from the page, with where each value came from. */
export type PageThemeReading = {
  seed: Partial<ThemeSeed>;
  evidence: ThemeEvidence;
  /** The design system whose variables were found, if any. */
  system?: string;
};
