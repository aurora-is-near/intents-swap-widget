type DoneMarkProps = {
  /** Width and height in px: 68 in the borrow dialog, 44 on a repaid loan. */
  size: number;
  className?: string;
};

/**
 * The done badge: the `badge` circle with the `accent` tick
 * (Web-Borrow.dc.html line 972, Web-Repaid.dc.html line 490), drawn on a
 * 68px viewBox and scaled to `size`. Decorative: the text beside it says
 * what is done.
 */
export function DoneMark({ size, className }: DoneMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 68 68"
      width={size}>
      <circle className="fill-badge" cx="34" cy="34" r="34" />
      <path
        className="stroke-accent"
        d="M20 35l10 10 18-19"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
    </svg>
  );
}
