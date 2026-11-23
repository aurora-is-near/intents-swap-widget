/**
 * The `.seg` pill (Web-Borrow.dc.html lines 136–137): padding 9px 18px,
 * radius 999, border 1.5px `bd2`, `sf`, 15px; hover border ink. Its
 * `inline-flex`, `gap:8px` and weight 700 come from the component's own
 * base classes. Shared by `Button`'s `secondary` variant and `Tab`.
 *
 * index.css has `@source "../lib"`, so the app's Tailwind generates these
 * classes from this file.
 */
export const SEG_CLASSES =
  'rounded-full border-[1.5px] border-solid border-bd2 bg-sf px-[18px] py-[9px] text-[15px] text-ink enabled:hover:border-ink';
