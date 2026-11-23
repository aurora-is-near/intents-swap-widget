import type { SVGProps } from 'react';

/**
 * Internal icons, copied from the Web-Borrow.dc.html markup. The artboards
 * paint them `#111613` (the light theme's ink), which would vanish in the
 * dark theme, so the drawn colour is `currentColor`: set it with a `text-*`
 * class on the icon or its parent. Not exported from the package.
 *
 * Every icon is decorative (`aria-hidden`); the control that holds it
 * carries the accessible name.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Width and height in px. Defaults to the artboard's size. */
  size?: number;
};

/** The white glyph on the filled status circles (lines 986, 992, 1004, 1006). */
type CircleIconProps = IconProps & {
  /** The glyph's colour. The artboards use #FFFFFF in both themes. */
  glyphColor?: string;
};

/** Check, from the checkbox (line 313): 14px, stroke 2.2. */
export function CheckIcon({
  size = 14,
  strokeWidth = 2.2,
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 14 14"
      width={size}
      {...props}>
      <path
        d="M3 7.3l2.7 2.7L11 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

/** Close ×, from the dialog's `.ibtn` (line 982): 16px, stroke 2. */
export function CloseIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 16 16"
      width={size}
      {...props}>
      <path
        d="M3 3l10 10M13 3L3 13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={2}
      />
    </svg>
  );
}

/** Down chevron, from the `.pick` trigger (line 222): 14px, stroke 2. */
export function ChevronIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 14 14"
      width={size}
      {...props}>
      <path
        d="M3 5 L7 9 L11 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

/** Alert: a filled circle with "!" (danger banner, line 986). */
export function AlertIcon({
  size = 24,
  glyphColor = '#FFFFFF',
  ...props
}: CircleIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}>
      <circle cx="12" cy="12" fill="currentColor" r="12" />
      <path
        d="M12 6.5v7M12 16.5v1"
        stroke={glyphColor}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </svg>
  );
}

/** Clock: a filled circle with clock hands (warning banner, line 992). */
export function ClockIcon({
  size = 24,
  glyphColor = '#FFFFFF',
  ...props
}: CircleIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}>
      <circle cx="12" cy="12" fill="currentColor" r="12" />
      <path
        d="M12 6.5V12l3.5 2.2"
        fill="none"
        stroke={glyphColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </svg>
  );
}

/** Cross: a filled circle with "×" (failed step, line 1006). */
export function CrossIcon({
  size = 24,
  glyphColor = '#FFFFFF',
  ...props
}: CircleIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}>
      <circle cx="12" cy="12" fill="currentColor" r="12" />
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke={glyphColor}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </svg>
  );
}
