import { Button, DialogDescription, DialogTitle } from '@aurora-is-near/ui-kit';

/** Line 972: the 68px badge circle with the lime tick, as the step icons. */
function DoneMark() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto block"
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

/** Done: the tick, "Loan opened" and "View position". */
export function DoneContent({
  doneText,
  onViewPosition,
}: {
  doneText: string;
  onViewPosition: () => void;
}) {
  return (
    <>
      {/* Line 971: centred, padding 14px 0 6px. */}
      <div className="pt-3.5 pb-1.5 text-center">
        <DoneMark />
        {/* Line 973: 28px / 800, 18px above. */}
        <DialogTitle className="mt-4.5 text-28">Loan opened</DialogTitle>
        {/* Line 974: 16px / 1.45 `mut`, 10px above. */}
        <DialogDescription className="mt-2.5 text-16 leading-1.45">
          {doneText}
        </DialogDescription>
      </div>
      {/* Line 976: `.go`, 22px above. */}
      <Button className="mt-5.5" onClick={onViewPosition}>
        View position
      </Button>
    </>
  );
}
