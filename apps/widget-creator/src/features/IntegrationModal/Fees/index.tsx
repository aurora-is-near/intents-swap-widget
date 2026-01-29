import { clsx } from 'clsx';
import { useState } from 'react';
import { ArrowBackW700 as ArrowBack } from '@material-symbols-svg/react-rounded/icons/arrow-back';

import { FeeInput } from './FeeInput';

import { Button } from '@/uikit/Button';
import { TextInput } from '@/uikit/TextInput';
import { FeeJsonInput } from '@/uikit/TextAreaInput';
import { ExpandableToggleCard } from '@/uikit/ToggleCard';

const PROTOCOL_FEE_BASIS_POINTS = 5;

const feePercentStringToBasisPoints = (fee: string) =>
  parseFloat(fee ?? '0') * 100;

const basisPointsToFeePercentString = (fee: number) =>
  ((fee ?? 0) / 100).toFixed(2);

type Props = {
  apiKey: string;
  onClickBack: () => void;
};

export const Fees = ({ onClickBack }: Props) => {
  const [feeJson, setFeeJson] = useState('');
  const [customFee, setCustomFee] = useState(0);
  const [walletAddress, setWalletAddress] = useState('');

  return (
    <>
      <div className="px-csw-2xl pt-csw-2xl pb-csw-4xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-900 w-full sm:block hidden">
        <div className="flex items-center gap-csw-xl pt-csw-md sm:max-w-[80%] max-w-full">
          <button onClick={onClickBack} className="cursor-pointer">
            <ArrowBack size={16} className="text-csw-gray-50" />
          </button>
          <h2 className="text-csw-label-lg text-csw-gray-50">Edit fees</h2>
        </div>
      </div>

      <div className="flex flex-col gap-csw-2xl my-csw-2xl">
        <ExpandableToggleCard
          label="Add custom fee"
          onToggle={() => {}}
          description={
            <>
              Set up optional custom fees added on top of the protocol fee.{' '}
              <br className="hidden sm:block" />
              You earn 60% of your custom fee; we retain 40%.
            </>
          }>
          <div className="flex flex-col gap-csw-2xl">
            <FeeInput
              suffix="1.00% max"
              placeholder="0.00%"
              value={customFee ? basisPointsToFeePercentString(customFee) : ''}
              onChange={(value) =>
                value
                  ? setCustomFee(feePercentStringToBasisPoints(value))
                  : setCustomFee(0)
              }
            />

            <div className="flex flex-col gap-csw-2md">
              <span className="text-csw-label-md text-csw-gray-50">
                Your fee recipient address
              </span>
              <TextInput
                placeholder="Enter wallet address"
                value={walletAddress}
                onChange={setWalletAddress}
              />
            </div>
          </div>
        </ExpandableToggleCard>

        <ExpandableToggleCard
          label="Add JSON code"
          onToggle={() => {}}
          description={
            <>
              Use{' '}
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="text-csw-gray-50 underline"
                href="https://bonnevoyager.github.io/intents-1click-rule-engine">
                Fee Rule Builder
              </a>{' '}
              to precisely configure custom fees, then paste the JSON code here
              to apply them to your widget.
            </>
          }>
          <FeeJsonInput
            value={feeJson}
            placeholder="Paste your JSON code here"
            onChange={setFeeJson}
          />
        </ExpandableToggleCard>

        <div className="flex flex-col gap-csw-lg bg-csw-gray-900 rounded-csw-lg p-csw-2xl w-full">
          <header className="flex items-center justify-between w-full border-b border-csw-gray-800 pb-csw-xl">
            <span className="text-csw-label-md text-csw-gray-50">
              End user pays
            </span>
            <span className="text-csw-label-sm text-csw-gray-950 px-csw-sm py-csw-xs rounded-full bg-csw-gray-50">
              Applied to all trades
            </span>
          </header>

          <ul className="flex flex-col gap-csw-lg">
            <li className="flex items-center justify-between gap-csw-lg text-csw-label-md">
              <span className="text-csw-gray-200">Protocol fees</span>
              <span className="text-csw-accent-200">0.05%</span>
            </li>
            <li className="flex items-center justify-between gap-csw-lg text-csw-label-md">
              <span className="text-csw-gray-200">Your custom fee</span>
              <span
                className={clsx(
                  'text-csw-accent-400',
                  customFee && 'text-csw-gray-50',
                )}>{`+${basisPointsToFeePercentString(customFee)}%`}</span>
            </li>
            <li className="flex items-center justify-between gap-csw-lg text-csw-label-md text-csw-gray-50">
              <span>Total</span>
              <span>{`${basisPointsToFeePercentString(customFee + PROTOCOL_FEE_BASIS_POINTS)}%`}</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-csw-gray-900 pt-csw-2xl flex items-center gap-csw-lg">
          <Button
            fluid
            size="sm"
            variant="outlined"
            className="w-full"
            onClick={onClickBack}>
            Cancel
          </Button>
          <Button
            fluid
            size="sm"
            detail="accent"
            variant="primary"
            className="w-full"
            onClick={onClickBack}>
            Save
          </Button>
        </div>
      </div>
    </>
  );
};
