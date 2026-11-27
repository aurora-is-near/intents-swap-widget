import { Button, DialogDescription, DialogTitle } from '@aurora-is-near/ui-kit';

import { DoneMark } from '../DoneMark/DoneMark';

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
        {/* Line 972: the 68px badge, centred. */}
        <DoneMark className="mx-auto block" size={68} />
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
