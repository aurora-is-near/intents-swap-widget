import { Button, Card } from '@aurora-is-near/ui-kit';
import { useId } from 'react';

type PositionsMessageCardProps = {
  title: string;
  text: string;
  action: string;
  onAction: () => void;
  /** `alert` announces it at once, as for a read error. */
  role?: 'region' | 'alert';
};

/**
 * My positions in place of a list: a title, a line of text and one action
 * (Web-Positions-NotConnected.dc.html lines 393–398). `.card` at max-width
 * 560 at the column's left edge with its text centred (the artboard sets no
 * auto margin), padding 48px 28px at every width (the inline padding wins
 * over the 640px block's); title 26px / 800, tracking -0.02em; text 16px
 * `mut`, margin 8px 0 22px; the button is `.go` at
 * `padding:14px 26px;font-size:17px`, the kit's `md` size. The artboard sets
 * no line-height, so the browser's `normal` holds, not preflight's 1.5.
 */
export function PositionsMessageCard({
  title,
  text,
  action,
  onAction,
  role = 'region',
}: PositionsMessageCardProps) {
  const titleId = useId();

  return (
    <Card
      aria-labelledby={titleId}
      className="max-w-140 px-7 py-12 text-center"
      role={role}>
      <h2
        className="m-0 text-26 leading-font font-extrabold tracking-title"
        id={titleId}>
        {title}
      </h2>
      <p className="mt-2 mb-5.5 text-16 leading-font text-mut">{text}</p>
      <Button onClick={onAction} size="md">
        {action}
      </Button>
    </Card>
  );
}
