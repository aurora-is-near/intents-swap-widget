import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PositionsSummary } from '../PositionsSummary/PositionsSummary';
import { PositionCard } from './PositionCard';
import type { LoanPosition, PositionAsset } from '../../types';

/*
 * The My positions cards, to compare with the artboards
 * (easy-borrow-positions/Web-/Mob-Position, -Position-Two, -Positions-Multi,
 * -Position-AtRisk and easy-borrow-repay-and-withdraw-collateral/
 * Web-/Mob-Repaid.dc.html) at 1280 and 420px, in both themes (the toolbar's
 * theme switch). Sample loans on Aave V3, WETH against USDC.
 */

let assetCount = 0;

const asset = (symbol: string, amount: number, usd: number): PositionAsset => {
  assetCount += 1;

  return {
    id: `${symbol}-${assetCount}`,
    address: symbol.toLowerCase(),
    symbol,
    amount,
    usd,
  };
};

const ACTIVE: LoanPosition = {
  id: 'base:0xa238dd80c259a72e81d7e4664a9801593f98d1c5:0xaa',
  provider: 'aave-v3',
  providerName: 'Aave',
  network: 'base',
  chainLabel: 'Base',
  marketId: '0xa238dd80c259a72e81d7e4664a9801593f98d1c5',
  marketName: 'Aave V3 Base',
  owner: '0xaa',
  manageable: true,
  collateral: [asset('WETH', 1, 3000)],
  debt: [asset('USDC', 1200, 1200)],
  collateralUsd: 3000,
  debtUsd: 1200,
  ltv: 0.4,
  liquidationLtv: 0.83,
  health: 2.075,
  liquidationPrice: { symbol: 'WETH', usd: 1445.78 },
  borrowApr: 0.0485,
  interestPerYearUsd: 58.2,
  status: 'active',
};

const AT_RISK: LoanPosition = {
  ...ACTIVE,
  id: 'arbitrum:0x794a61358d6845594f94dc1db02a252b5b4814ad:0xaa',
  network: 'arbitrum',
  chainLabel: 'Arbitrum',
  marketId: '0x794a61358d6845594f94dc1db02a252b5b4814ad',
  marketName: 'Aave V3 Arbitrum',
  collateral: [asset('WBTC', 0.025, 2500), asset('WETH', 0.5, 1500)],
  debt: [asset('USDC', 2000, 2000), asset('USDT', 1000, 1000)],
  collateralUsd: 4000,
  debtUsd: 3000,
  ltv: 0.75,
  liquidationLtv: 0.81,
  health: 1.08,
  liquidationPrice: null,
  borrowApr: 0.052,
  interestPerYearUsd: 156,
  status: 'at-risk',
};

const REPAID: LoanPosition = {
  ...ACTIVE,
  id: 'base:repaid',
  debt: [],
  debtUsd: 0,
  collateral: [asset('WETH', 0.25, 750)],
  collateralUsd: 750,
  ltv: 0,
  health: null,
  liquidationPrice: null,
  borrowApr: null,
  interestPerYearUsd: null,
  status: 'repaid',
};

const READ_ONLY: LoanPosition = {
  ...ACTIVE,
  id: 'mainnet:morpho:0xbb',
  provider: 'morpho-blue',
  providerName: 'Morpho',
  network: 'mainnet',
  chainLabel: 'Ethereum',
  marketName: 'wstETH / USDC',
  manageable: false,
  collateral: [asset('wstETH', 2, 7200)],
  debt: [asset('USDC', 500, 500)],
  collateralUsd: 7200,
  debtUsd: 500,
  ltv: 0.07,
  liquidationLtv: null,
  health: 12.4,
  liquidationPrice: null,
  borrowApr: null,
  interestPerYearUsd: null,
};

const meta = {
  title: 'Positions/PositionCard',
  component: PositionCard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PositionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Web-Position: one loan, healthy. */
export const Active: Story = { args: { position: ACTIVE } };

/**
 * Web-Position-AtRisk: the danger banner, its actions disabled until Add
 * collateral and Repay ship; two collateral and debt reserves.
 */
export const AtRisk: Story = { args: { position: AT_RISK } };

/** No debt left: the same card, "COLLATERAL ONLY". */
export const Repaid: Story = { args: { position: REPAID } };

/** A loan Borrow cannot manage: the provider in the pill, no actions. */
export const ReadOnly: Story = { args: { position: READ_ONLY } };

/** Unknown figures show "—". */
export const UnknownFigures: Story = {
  args: {
    position: {
      ...ACTIVE,
      ltv: null,
      liquidationLtv: null,
      health: null,
      liquidationPrice: null,
      borrowApr: null,
      interestPerYearUsd: null,
    },
  },
};

const LOANS = [ACTIVE, AT_RISK, REPAID];

/**
 * Web-Positions-Multi: the summary above the selected loan; picking a card
 * shows it.
 */
export const Multi: Story = {
  args: { position: AT_RISK },
  render: function Render() {
    const [selected, setSelected] = useState(AT_RISK.id);
    const position = LOANS.find(({ id }) => id === selected) ?? AT_RISK;

    return (
      <div>
        <PositionsSummary
          className="mb-4.5"
          positions={LOANS}
          selectedId={selected}
          onSelect={setSelected}
        />
        <div className="flex flex-wrap items-start gap-6">
          <PositionCard position={position} />
        </div>
      </div>
    );
  },
};
