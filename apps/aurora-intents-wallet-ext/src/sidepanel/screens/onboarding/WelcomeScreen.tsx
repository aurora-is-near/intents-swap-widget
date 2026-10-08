import { Button, CHAIN_ICONS } from '@aurora-is-near/intents-swap-widget';
import type { Chains } from '@aurora-is-near/intents-swap-widget';

import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';

const APP_TILE_CELLS = [
  { id: 'tl', color: 'bg-sw-gray-600' },
  { id: 'tr', color: 'bg-sw-gray-700' },
  { id: 'bl', color: 'bg-sw-gray-700' },
  { id: 'br', color: 'bg-sw-gray-600' },
];

const ChainTile = ({
  chain,
  className,
}: {
  chain: Chains;
  className: string;
}) => (
  <div
    className={`absolute flex h-[64px] w-[64px] items-center justify-center rounded-sw-lg bg-sw-gray-900 ${className}`}>
    <span className="block h-[32px] w-[32px] overflow-hidden rounded-full [&>svg]:h-full [&>svg]:w-full">
      {CHAIN_ICONS[chain]}
    </span>
  </div>
);

/** "Tokens from many chains in one account", from the design's hero. */
const Hero = () => (
  <div
    role="img"
    aria-label="Tokens from many chains in one account"
    className="relative h-[208px] w-[280px] shrink-0">
    <ChainTile chain="eth" className="left-0 top-0" />
    <ChainTile chain="sol" className="left-0 top-[72px]" />
    <div className="absolute left-[72px] top-0 flex h-[136px] w-[136px] items-center justify-center rounded-sw-lg bg-[#70d44b] text-white">
      <svg width="88" height="88" viewBox="0 0 288 288" aria-hidden="true">
        <g transform="translate(28.8 36) scale(0.8)">
          <path
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinejoin="round"
            d="M144,58.8c7.6,0,14.5,4.3,17.9,11.1l56.2,112.5c4.9,9.9,0.9,21.9-9,26.8c-2.8,1.4-5.8,2.1-8.9,2.1H87.8 c-11,0-20-9-20-20c0-3.1,0.7-6.2,2.1-8.9l56.2-112.5C129.5,63,136.4,58.7,144,58.8 M144,45c-12.8,0-24.5,7.2-30.2,18.7L57.6,176.2 c-8.3,16.7-1.6,36.9,15.1,45.3c4.7,2.3,9.9,3.6,15.1,3.6h112.5c18.6,0,33.8-15.1,33.8-33.7c0-5.2-1.2-10.4-3.6-15.1L174.2,63.7 C168.5,52.2,156.8,45,144,45z"
          />
        </g>
      </svg>
    </div>
    <ChainTile chain="near" className="left-[216px] top-0" />
    <ChainTile chain="btc" className="left-[216px] top-[72px]" />
    <div className="absolute left-0 top-[144px] flex h-[64px] w-[136px] items-center gap-sw-lg rounded-sw-lg bg-sw-gray-900 px-sw-xl">
      <span className="block h-[32px] w-[32px] overflow-hidden rounded-full [&>svg]:h-full [&>svg]:w-full">
        {CHAIN_ICONS.base}
      </span>
      <span className="flex flex-col gap-sw-sm">
        <span className="block h-[8px] w-[52px] rounded-full bg-sw-gray-600" />
        <span className="block h-[8px] w-[32px] rounded-full bg-sw-gray-700" />
      </span>
    </div>
    <div className="absolute left-[144px] top-[144px] flex h-[64px] w-[64px] items-center justify-center rounded-sw-lg bg-sw-accent-500 text-sw-gray-950">
      <Icon name="swap" size={28} strokeWidth={2.5} />
    </div>
    <div className="absolute left-[216px] top-[144px] flex h-[64px] w-[64px] items-center justify-center rounded-sw-lg bg-sw-gray-800">
      <span className="grid grid-cols-2 gap-sw-xs">
        {APP_TILE_CELLS.map(({ id, color }) => (
          <span
            key={id}
            className={`block h-[10px] w-[10px] rounded-[3px] ${color}`}
          />
        ))}
      </span>
    </div>
  </div>
);

export const WelcomeScreen = () => {
  const { push } = useNavigation();

  return (
    <Screen
      className="items-center justify-center gap-sw-4xl px-sw-3xl pt-sw-4xl"
      footer={
        <>
          <Button
            variant="primary"
            size="lg"
            onClick={() => push({ name: 'createPasskey' })}>
            Create new account
          </Button>
          <p className="m-0 mt-sw-xs text-center text-sw-body-sm text-sw-gray-400">
            By continuing you agree to the Terms of Service.
          </p>
        </>
      }>
      <Hero />
      <div className="flex flex-col items-center gap-sw-lg text-center">
        <h1 className="m-0 max-w-[320px] text-sw-value-lg text-sw-gray-50">
          Swap anything
          <br />
          on any chain
        </h1>
        <p className="m-0 max-w-[320px] text-sw-body-md text-sw-gray-200">
          One account for 35+ chains. Deposit from any network, swap in seconds
          and withdraw wherever you like.
        </p>
      </div>
    </Screen>
  );
};
