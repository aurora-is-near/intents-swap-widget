import {
  type CSSProperties,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

import { formatColor, parseColor } from '../color';
import { completeSeed, SEED_RANGES, type ThemeSeed } from '../derive';
import { combinedSeed } from '../resolve';
import { CSS_VARIABLES, type ThemeTokens } from '../tokens';
import { withEdits } from './bridge';
import { contrastChecks } from './checks';
import { themeConfig } from './config';
import { SEED_FIELDS, type SeedField, seedSource } from './fields';
import { type InspectedTheme, inspectorStore, type SeedEdits } from './store';

/** The picker's value: `#rrggbb`, any alpha dropped. */
const toHex = (value: string | undefined) => {
  const color = parseColor(value ?? '');

  return color ? formatColor({ ...color, a: 1 }) : '#000000';
};

const Swatch = ({ color }: { color: string }) => (
  <span className="swatch" style={{ '--swatch': color } as CSSProperties} />
);

/** A text field that commits on Enter or blur, when the value is valid. */
const Draft = ({
  value,
  placeholder,
  label,
  isValid = () => true,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  label: string;
  isValid?: (value: string) => boolean;
  onCommit: (value: string) => void;
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const next = draft.trim();
  const valid = !next || isValid(next);

  const commit = () => {
    if (next && next !== value && isValid(next)) {
      onCommit(next);
    } else {
      setDraft(value);
    }
  };

  return (
    <input
      type="text"
      aria-label={label}
      className={valid ? undefined : 'invalid'}
      value={draft}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit();
        }
      }}
    />
  );
};

const formatNumber = (value: number, field: SeedField & { kind: 'range' }) =>
  `${field.step < 1 ? value.toFixed(2) : Math.round(value)}${field.unit}`;

const SeedControl = ({
  field,
  value,
  placeholder,
}: {
  field: SeedField;
  value: ThemeSeed[keyof ThemeSeed] | undefined;
  placeholder?: string;
}) => {
  if (field.kind === 'color') {
    const color = typeof value === 'string' ? value : undefined;

    return (
      <>
        <input
          type="color"
          aria-label={`${field.key}, picker`}
          value={toHex(color ?? placeholder)}
          onChange={(event) =>
            inspectorStore.edit(field.key, event.target.value)
          }
        />
        <Draft
          label={field.key}
          value={color ?? ''}
          placeholder={placeholder}
          isValid={(next) => parseColor(next) !== undefined}
          onCommit={(next) => inspectorStore.edit(field.key, next)}
        />
      </>
    );
  }

  if (field.kind === 'range') {
    const [min, max] = SEED_RANGES[field.key];
    const number = Number(value);

    return (
      <>
        <input
          type="range"
          aria-label={field.key}
          min={min}
          max={max}
          step={field.step}
          value={number}
          onChange={(event) =>
            inspectorStore.edit(field.key, Number(event.target.value))
          }
        />
        <span className="num">{formatNumber(number, field)}</span>
      </>
    );
  }

  if (field.kind === 'scheme') {
    return (
      <select
        aria-label="scheme"
        value={value === 'dark' ? 'dark' : 'light'}
        onChange={(event) =>
          inspectorStore.edit(
            'scheme',
            event.target.value === 'dark' ? 'dark' : 'light',
          )
        }>
        <option value="light">light</option>
        <option value="dark">dark</option>
      </select>
    );
  }

  return (
    <Draft
      label="font"
      value={String(value ?? '')}
      onCommit={(next) => inspectorStore.edit('font', next)}
    />
  );
};

const SeedSection = ({
  inspected,
  edits,
}: {
  inspected: InspectedTheme;
  edits: SeedEdits;
}) => {
  const seed = completeSeed(
    combinedSeed(withEdits(inspected.theme, edits), inspected.reading?.seed),
  );

  return (
    <section>
      <h3>Seed</h3>
      {SEED_FIELDS.map((field) => {
        const value = seed[field.key];
        const source = seedSource(field.key, inspected, edits, value);
        const placeholder =
          field.kind === 'color' && field.derivedAs
            ? inspected.tokens[field.derivedAs]
            : undefined;

        return (
          <div key={field.key} className="row" title={field.about}>
            <span className="name">{field.key}</span>
            <span className="control">
              <SeedControl
                field={field}
                value={value}
                placeholder={placeholder}
              />
            </span>
            <span
              className={source === 'edit' ? 'source edit' : 'source'}
              title={source}>
              {source.replace(/^computed:/, '')}
            </span>
            {edits[field.key] !== undefined ? (
              <button
                type="button"
                className="icon"
                aria-label={`Give ${field.key} back to the page`}
                title="Undo the edit"
                onClick={() => inspectorStore.edit(field.key, undefined)}>
                ↺
              </button>
            ) : (
              <span />
            )}
          </div>
        );
      })}
    </section>
  );
};

const ContrastSection = ({ tokens }: { tokens: ThemeTokens }) => (
  <section>
    <h3>Contrast</h3>
    {contrastChecks(tokens).map((check) => (
      <div
        key={check.label}
        className="check"
        title={`${check.fg} on ${check.on.join(', ')}`}>
        <span className="name">{check.label}</span>
        <span className="ratios">
          {check.ratios.map((ratio, index) => (
            <span
              key={check.on[index]}
              className={ratio >= check.min ? 'ok' : 'bad'}
              title={check.on[index]}>
              {ratio.toFixed(2)}
            </span>
          ))}
        </span>
        <span className="min">≥ {check.min}</span>
      </div>
    ))}
  </section>
);

/**
 * Copies `text`: the Clipboard API, else the copy command on a hidden text
 * area, since a page (or an embedded browser) can deny the API.
 */
const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);

    return true;
  } catch {
    const area = document.createElement('textarea');

    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position: fixed; opacity: 0; pointer-events: none;';
    document.body.append(area);
    area.select();

    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
};

/** Copies `text`; if nothing works, says to copy it by hand. */
const CopyButton = ({ text }: { text: string }) => {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') {
      return undefined;
    }

    const timer = setTimeout(() => setState('idle'), 1800);

    return () => clearTimeout(timer);
  }, [state]);

  const copy = () => {
    void copyText(text).then((copied) =>
      setState(copied ? 'copied' : 'failed'),
    );
  };

  const labels = {
    idle: 'Copy as config',
    copied: 'Copied',
    failed: 'Copy it from above',
  };

  return (
    <button type="button" className="primary" onClick={copy}>
      {labels[state]}
    </button>
  );
};

const ConfigSection = ({
  inspected,
  edits,
}: {
  inspected: InspectedTheme;
  edits: SeedEdits;
}) => {
  const config = JSON.stringify(themeConfig(inspected.theme, edits), null, 2);

  return (
    <section>
      <h3>Config</h3>
      <p>
        The site adapter&apos;s theme, with each edit pinned for the page
        reader.
      </p>
      <pre>{config}</pre>
      <div className="actions">
        <CopyButton text={config} />
      </div>
    </section>
  );
};

const TokensSection = ({ tokens }: { tokens: ThemeTokens }) => {
  const keys = Object.keys(tokens) as (keyof ThemeTokens)[];

  return (
    <details>
      <summary>Tokens ({keys.length})</summary>
      {keys.map((key) => (
        <div key={key} className="token">
          <span className="name">{CSS_VARIABLES[key]}</span>
          {parseColor(tokens[key]) ? <Swatch color={tokens[key]} /> : <span />}
          <span className="value mono" title={tokens[key]}>
            {tokens[key]}
          </span>
        </div>
      ))}
    </details>
  );
};

/**
 * The theme inspector (`THEME_INSPECTOR`): where each seed value came from, live
 * edits over them, the derived tokens' contrast, and the edits as a config
 * for the site adapter.
 */
export const ThemeInspector = ({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  /** Opens the themed UI, which reads the page when it first opens. */
  onOpen?: () => void;
}) => {
  const inspected = useSyncExternalStore(
    inspectorStore.subscribe,
    inspectorStore.inspected,
  );

  const edits = useSyncExternalStore(
    inspectorStore.subscribe,
    inspectorStore.edits,
  );

  const [side, setSide] = useState<'left' | 'right'>('right');
  const edited = Object.keys(edits).length > 0;

  return (
    <div
      className={`panel ${side}`}
      role="dialog"
      aria-label="Aurora theme inspector">
      <header>
        <h2>Theme</h2>
        {inspected?.reading?.system ? (
          <span className="badge" title="Design system found on the page">
            {inspected.reading.system}
          </span>
        ) : null}
        {edited ? (
          <button type="button" onClick={inspectorStore.reset}>
            Reset
          </button>
        ) : null}
        <button
          type="button"
          className="icon"
          aria-label="Move to the other side"
          onClick={() => setSide(side === 'right' ? 'left' : 'right')}>
          {side === 'right' ? '←' : '→'}
        </button>
        <button
          type="button"
          className="icon"
          aria-label="Close the inspector"
          onClick={onClose}>
          ×
        </button>
      </header>
      {inspected ? (
        <>
          <SeedSection inspected={inspected} edits={edits} />
          <ContrastSection tokens={inspected.tokens} />
          <ConfigSection inspected={inspected} edits={edits} />
          <TokensSection tokens={inspected.tokens} />
        </>
      ) : (
        <section>
          <p>The modal reads the page when it first opens.</p>
          {onOpen ? (
            <button type="button" className="primary" onClick={onOpen}>
              Open it
            </button>
          ) : null}
        </section>
      )}
    </div>
  );
};
