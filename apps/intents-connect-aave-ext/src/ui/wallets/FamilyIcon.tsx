import type { DetectedFamily } from '@aurora-is-near/intents-connect-wallet/detect';

/** Black and white marks: Ethereum's diamond, Solana's bars, NEAR's N. */
const PATHS: Record<DetectedFamily, string> = {
  evm: 'M12 2 5.5 12.3 12 16l6.5-3.7L12 2Zm-6.5 11.6L12 22l6.5-8.4L12 17.3l-6.5-3.7Z',
  sol: 'M7 5h13l-3 3.2H4L7 5Zm-3 5.4h13l3 3.2H7l-3-3.2Zm3 5.4h13l-3 3.2H4l3-3.2Z',
  near: 'M6 4h2.6l6.9 10.7V4H18v16h-2.6L8.5 9.3V20H6V4Z',
};

export const FamilyIcon = ({
  family,
  size = 14,
}: {
  family: DetectedFamily;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden>
    <path d={PATHS[family]} />
  </svg>
);
