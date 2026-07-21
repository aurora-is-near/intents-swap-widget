type Props = {
  feesUsd?: string | null;
  feesPercent?: string | null;
};

export const FeeValue = ({ feesPercent, feesUsd }: Props) => {
  if (!feesUsd && !feesPercent) {
    return '—';
  }

  if (!feesUsd) {
    return `${feesPercent}%`;
  }

  return (
    <>
      <span className="text-sw-gray-400">({feesUsd})</span>
      {'\u00A0'}
      {'\u00A0'}
      {`${feesPercent}%`}
    </>
  );
};
