/**
 * The borrow dialog's 68px done badge: the `badge` circle with the `accent`
 * tick (Web-Borrow.dc.html line 972). Decorative: the text beside it says
 * what is done.
 */
export function DoneMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height="68"
      viewBox="0 0 68 68"
      width="68">
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
