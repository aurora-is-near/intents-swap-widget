import type { ThemeSeed } from '../derive';
import type { PageThemeReading } from '../read';
import type { SupplyTheme } from '../resolve';
import type { ThemeTokens } from '../tokens';

/**
 * Whether the inspector is built in, a build-time constant: on in dev
 * builds (`--mode development`), and where the build sets
 * `import.meta.env.VITE_THEME_INSPECTOR` to `'true'`, as this extension
 * does in every build. Off, the build drops the inspector, this store and
 * the hooks that feed it.
 */
export const THEME_INSPECTOR =
  import.meta.env.MODE === 'development' ||
  import.meta.env.VITE_THEME_INSPECTOR === 'true';

/** What the modal applies, as the inspector shows it. */
export type InspectedTheme = {
  theme?: SupplyTheme;
  reading?: PageThemeReading;
  tokens: ThemeTokens;
};

/** Seed values set in the inspector: they beat the page and the theme. */
export type SeedEdits = Partial<ThemeSeed>;

const listeners = new Set<() => void>();
let inspected: InspectedTheme | undefined;
let edits: SeedEdits = {};

const emit = () => listeners.forEach((listener) => listener());

/**
 * Between the modal's `ThemeStyle` and the inspector: the modal publishes
 * what it applies, and applies the inspector's edits. Snapshots keep their
 * identity until they change (`useSyncExternalStore`).
 */
export const inspectorStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
  inspected: () => inspected,
  edits: () => edits,
  publish: (next: InspectedTheme) => {
    inspected = next;
    emit();
  },
  /** Sets one seed value; `undefined` gives it back to the page. */
  edit: <K extends keyof ThemeSeed>(
    key: K,
    value: ThemeSeed[K] | undefined,
  ) => {
    const next = { ...edits };

    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }

    edits = next;
    emit();
  },
  reset: () => {
    edits = {};
    emit();
  },
};
