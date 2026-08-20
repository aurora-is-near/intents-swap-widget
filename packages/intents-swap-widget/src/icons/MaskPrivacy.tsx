import { forwardRef } from 'react';
import type { SVGProps } from 'react';

// The artwork is wider than it is tall, so `size` sets the height and the width
// follows from the viewBox. Fitting it into a square `size` box instead would
// letterbox it and render it at roughly half the visual weight of a square icon.
const VIEWBOX_WIDTH = 122.88;
const VIEWBOX_HEIGHT = 66.56;
const ASPECT_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

export type MaskPrivacyProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
  /** Height in pixels. The width scales with it to keep the aspect ratio. */
  size?: number;
  /** Overrides the colour inherited from a `text-*` class. */
  color?: string;
};

export const MaskPrivacy = forwardRef<SVGSVGElement, MaskPrivacyProps>(
  ({ size = 24, color, style, ...props }, ref) => (
    <svg
      ref={ref}
      width={size * ASPECT_RATIO}
      height={size}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ color, ...style }}
      {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0,3.27c0.2-2.04,1.28-2.86,3.36-2.32c2.9,0.71,5.87,0.98,8.91,0.79c7.02-0.44,9.14-3.14,17.05-0.79 C40.2,4.39,50.95,7.59,60.83,9.22C74.79,8.2,84.61,2.25,94.54,0.69c8.65-2.18,14.2,3,25.18,0c2.51-0.21,3.41,0.17,3.1,3.36 c-0.66,12.31-2.38,32.36-12.06,43.11c-7.91,8.78-22.25,8.78-33.7,13.96l-14.67,5.44c-6.72-0.84-13.33-3.32-19.89-6.59 c-8.38-3.24-14.94-4.91-21.05-6.2C2.86,45.53,1.2,20.98,0,3.27L0,3.27z M15.4,14.96c11.08-0.19,30.75,0.11,35.08,13.25 c0.8,2.43,0.8,4.91-0.03,7.55C27.99,37.02,20.87,30.28,15.4,14.96L15.4,14.96z M107.48,18.23c-11.85-4.66-35.98-5.8-39.86,9.98 c-0.61,2.49-1.16,4.91-0.34,7.55C89.2,36.06,99.96,32.88,107.48,18.23L107.48,18.23z"
      />
    </svg>
  ),
);

MaskPrivacy.displayName = 'MaskPrivacy';
