import type { ReactNode, SVGProps } from 'react';

/**
 * Internal icons, copied from the Web-Borrow.dc.html markup. The artboards
 * paint them `#111613` (the light theme's ink), which would vanish in the
 * dark theme, so the drawn colour is `currentColor`: set it with a `text-*`
 * class on the icon or its parent. Not exported from the package.
 *
 * Every icon is decorative (`aria-hidden`); the control that holds it
 * carries the accessible name.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Width and height in px. Defaults to the artboard's size. */
  size?: number;
};

/**
 * The glyph on the filled status circles (lines 986, 992, 1006): white in
 * both themes by choice. The artboard's theme rule (line 168) repaints it
 * `--sf` in dark, which is only about 2.7:1 on `#A8321F`; white is 6.4:1.
 */
const GLYPH = '#FFFFFF';

/** The decorative square `<svg>` every icon draws in, `box` px a side. */
function IconSvg({
  box,
  size = box,
  children,
  ...props
}: IconProps & { box: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      {...props}>
      {children}
    </svg>
  );
}

/** A 24px filled status circle in `currentColor`, its glyph on top. */
function CircleIconSvg({
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <IconSvg box={24} {...props}>
      <circle cx="12" cy="12" fill="currentColor" r="12" />
      {children}
    </IconSvg>
  );
}

/** Check, from the checkbox (line 313): 14px, stroke 2.2. */
export function CheckIcon({ strokeWidth = 2.2, ...props }: IconProps) {
  return (
    <IconSvg box={14} {...props}>
      <path
        d="M3 7.3l2.7 2.7L11 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </IconSvg>
  );
}

/** Close ×, from the dialog's `.ibtn` (line 982): 16px, stroke 2. */
export function CloseIcon(props: IconProps) {
  return (
    <IconSvg box={16} {...props}>
      <path
        d="M3 3l10 10M13 3L3 13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={2}
      />
    </IconSvg>
  );
}

/** Down chevron, from the `.pick` trigger (line 222): 14px, stroke 2. */
export function ChevronIcon(props: IconProps) {
  return (
    <IconSvg box={14} {...props}>
      <path
        d="M3 5 L7 9 L11 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </IconSvg>
  );
}

/** Alert: a filled circle with "!" (danger banner, line 986). */
export function AlertIcon(props: IconProps) {
  return (
    <CircleIconSvg {...props}>
      <path
        d="M12 6.5v7M12 16.5v1"
        stroke={GLYPH}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </CircleIconSvg>
  );
}

/** Clock: a filled circle with clock hands (warning banner, line 992). */
export function ClockIcon(props: IconProps) {
  return (
    <CircleIconSvg {...props}>
      <path
        d="M12 6.5V12l3.5 2.2"
        fill="none"
        stroke={GLYPH}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </CircleIconSvg>
  );
}

/** Cross: a filled circle with "×" (failed step, line 1006). */
export function CrossIcon(props: IconProps) {
  return (
    <CircleIconSvg {...props}>
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke={GLYPH}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </CircleIconSvg>
  );
}

/**
 * Done: a filled circle with a check (done step, line 1004). The artboard
 * paints the circle `#111613`, which its theme rule `.aur svg
 * circle[fill="#111613"]` (line 171) turns into `--badge`: give the icon
 * `text-badge`. The check is `#C9EB8A`, the `--accent` token, the same in
 * both themes.
 */
export function DoneIcon(props: IconProps) {
  return (
    <CircleIconSvg {...props}>
      <path
        className="stroke-accent"
        d="M7 12.4l3.3 3.3L17 8.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </CircleIconSvg>
  );
}
