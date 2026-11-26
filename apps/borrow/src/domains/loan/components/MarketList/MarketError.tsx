import { Banner, Button } from '@aurora-is-near/ui-kit';

type MarketErrorProps = {
  title: string;
  retry: () => void;
};

/** A failed read in the card's place: a kit `Banner` with a retry. */
export function MarketError({ title, retry }: MarketErrorProps) {
  return (
    <Banner
      className="min-w-0 flex-[1_1_170px] mobile:flex-[1_1_0]"
      title={title}
      tone="danger">
      <p className="m-0">The market data could not be read.</p>
      <Button
        className="mt-2.5 px-3.5 py-1.5 text-14"
        variant="secondary"
        onClick={retry}>
        Try again
      </Button>
    </Banner>
  );
}
