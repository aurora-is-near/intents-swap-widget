import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { RuleEngine } from 'intents-1click-rule-engine';
import { ArrowBackW700 as ArrowBack } from '@material-symbols-svg/react-rounded/icons/arrow-back';
import type { Fee, FeeConfig } from 'intents-1click-rule-engine';

import { FeeInput } from './FeeInput';

import { Button } from '@/uikit/Button';
import { TextInput } from '@/uikit/TextInput';
import { TextAreaInput } from '@/uikit/TextAreaInput';
import { ExpandableToggleCard } from '@/uikit/ToggleCard';
import { useUpdateApiKey } from '@/api/hooks';
import { DEFAULT_ZERO_FEE } from '@/constants';
import type { ApiKey } from '@/api/types';

const PROTOCOL_FEE_BASIS_POINTS = 5;

const feePercentStringToBasisPoints = (fee: string) =>
  parseFloat(fee ?? '0') * 100;

const basisPointsToFeePercentString = (fee: number) =>
  ((fee ?? 0) / 100).toFixed(2);

const getValueBasedFee = (feeRules: FeeConfig): Fee | undefined => {
  if (feeRules.rules.length === 0) {
    if (Array.isArray(feeRules.default_fee)) {
      return undefined;
    }

    return feeRules.default_fee;
  }

  return undefined;
};

const isZeroValueBasedFee = (feeRules: FeeConfig): boolean => {
  const isValueBasedFee = getValueBasedFee(feeRules);

  if (!isValueBasedFee) {
    return false;
  }

  return isValueBasedFee.bps === 0;
};

type Props = {
  apiKey: ApiKey;
  onClickBack: () => void;
};

export const Fees = ({ apiKey, onClickBack }: Props) => {
  const [feeRules, setFeeRules] = useState<FeeConfig | undefined>();

  // value based fee
  const valueBasedFee = getValueBasedFee(apiKey.feeRules);
  const [customFee, setCustomFee] = useState(valueBasedFee?.bps ?? 0);
  const [walletAddress, setWalletAddress] = useState(
    valueBasedFee?.recipient ?? '',
  );

  // custom fee json config
  const [feeJson, setFeeJson] = useState(
    valueBasedFee ? JSON.stringify(apiKey.feeRules, null, 2) : '',
  );

  // means only default fee is set
  const isFeeConfigSetAsValue = apiKey.feeRules.rules.length === 0;
  const [isCustomFeeOpen, setIsCustomFeeOpen] = useState(
    isFeeConfigSetAsValue && !isZeroValueBasedFee(apiKey.feeRules),
  );

  // means fee config has been loaded from JSON
  // because there is no UI to provide detail configuration
  const isFeeConfigSetAsJson = apiKey.feeRules.rules.length > 0;
  const [isJsonCodeOpen, setIsJsonCodeOpen] = useState(isFeeConfigSetAsJson);

  const [feeJsonError, setFeeJsonError] = useState<string | undefined>();
  const [customFeeError, setCustomFeeError] = useState<string | undefined>();
  const [walletAddressError, setWalletAddressError] = useState<
    string | undefined
  >();

  const { mutate: updateApiKey, ...mutation } = useUpdateApiKey(
    apiKey.widgetAppKey,
  );

  useEffect(() => {
    if (isCustomFeeOpen) {
      setFeeRules({
        version: '1.0.0',
        rules: [],
        default_fee: {
          type: 'bps',
          // default to zero fee
          bps: customFee,
          recipient: walletAddress,
        },
      });
    } else if (isJsonCodeOpen) {
      let rules: FeeConfig;

      try {
        // we don't really care what the output is
        // it will be validated on save
        rules = JSON.parse(feeJson) as FeeConfig;
        // eslint-disable-next-line no-new
        new RuleEngine(rules);
      } catch (error) {
        if (feeRules) {
          if (error instanceof Error) {
            // ignore showing JSON syntax errors on save
            if (error.message.includes('Invalid fee config')) {
              setFeeJsonError(error.message);
            }
          } else {
            setFeeJsonError('Invalid JSON configuration');
          }
        } else {
          setFeeJsonError(undefined);
        }

        return;
      }

      setFeeRules(rules);
    } else {
      setFeeRules(undefined);
    }
  }, [feeJson, customFee, walletAddress, isCustomFeeOpen, isJsonCodeOpen]);

  const handleToggleCustomFee = (isOpen: boolean) => {
    setIsCustomFeeOpen(isOpen);

    if (isOpen && isJsonCodeOpen) {
      setIsJsonCodeOpen(false);
    }
  };

  const handleToggleJsonCode = (isOpen: boolean) => {
    setIsJsonCodeOpen(isOpen);

    if (isOpen && isCustomFeeOpen) {
      setIsCustomFeeOpen(false);
    }
  };

  const handleSave = () => {
    let hasErrors = false;

    if (isCustomFeeOpen) {
      // other validation handled by imask
      if (!customFee) {
        hasErrors = true;
        setCustomFeeError('Custom fee is required');
      }

      if (!walletAddress) {
        hasErrors = true;
        setWalletAddressError('Wallet address is required');
      }
    } else if (isJsonCodeOpen) {
      if (!feeJson) {
        hasErrors = true;
        setFeeJsonError('JSON configuration is required');
      }
    }

    try {
      // we don't really care what the output is
      // it will be validated on save
      const rules = JSON.parse(feeJson) as FeeConfig;

      // eslint-disable-next-line no-new
      new RuleEngine(rules);
    } catch (error) {
      if (feeRules) {
        if (error instanceof Error) {
          // ignore showing JSON syntax errors on save
          setFeeJsonError(error.message);
          hasErrors = true;
        } else {
          setFeeJsonError('Invalid JSON configuration');
          hasErrors = true;
        }
      } else {
        setFeeJsonError(undefined);
      }
    }

    if (hasErrors) {
      return;
    }

    updateApiKey({
      isEnabled: true,
      feeRules: feeRules ?? DEFAULT_ZERO_FEE,
    });
  };

  // reset JSON field or re-toggle if user removed initial JSON code
  // if user changed it - show changed code as it is to proceed working with it
  useEffect(() => {
    if (isJsonCodeOpen && !feeJson && apiKey.feeRules) {
      setFeeJson(JSON.stringify(apiKey.feeRules, null, 2));
    }
  }, [isJsonCodeOpen]);

  useEffect(() => {
    if (mutation.status === 'error') {
      if (mutation.error.code === 'INVALID_API_KEY_CONFIGURATION') {
        setFeeJsonError('Invalid JSON configuration');
      } else if (mutation.error.code === 'FAILED_TO_UPDATE_API_KEY') {
        if (mutation.error.message.includes('Invalid fee config')) {
          setFeeJsonError(mutation.error.message.replace('body/feeRules ', ''));
        } else {
          setFeeJsonError('Invalid JSON configuration');
        }
      } else {
        setFeeJsonError(undefined);
      }
    } else {
      setFeeJsonError(undefined);

      if (mutation.status === 'success') {
        onClickBack();
      }
    }
  }, [mutation.status]);

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
          isExpanded={isCustomFeeOpen}
          onToggle={handleToggleCustomFee}
          description={
            <>
              Set up optional custom fees added on top of the protocol fee.{' '}
              <br className="hidden sm:block" />
              You earn 60% of your custom fee; we retain 40%.
            </>
          }>
          <div className="flex flex-col gap-csw-2xl">
            <div className="flex flex-col gap-csw-md">
              {!!customFeeError && (
                <span className="text-csw-label-sm text-csw-status-error -mt-[22px]">
                  {customFeeError}
                </span>
              )}
              <FeeInput
                suffix="1.00% max"
                placeholder="0.00%"
                state={customFeeError ? 'error' : 'normal'}
                value={
                  customFee ? basisPointsToFeePercentString(customFee) : ''
                }
                onChange={(value) => {
                  setCustomFeeError(undefined);

                  if (value) {
                    setCustomFee(feePercentStringToBasisPoints(value));
                  } else {
                    setCustomFee(0);
                  }
                }}
              />
            </div>

            <div className="flex flex-col gap-csw-2md">
              <div className="flex items-center justify-between">
                <span className="text-csw-label-md text-csw-gray-50">
                  Your fee recipient address
                </span>
                {!!walletAddressError && (
                  <span className="text-csw-label-sm text-csw-status-error">
                    {walletAddressError}
                  </span>
                )}
              </div>
              <TextInput
                state={walletAddressError ? 'error' : 'normal'}
                placeholder="Enter wallet address"
                value={walletAddress}
                onChange={(value) => {
                  setWalletAddressError(undefined);
                  setWalletAddress(value);
                }}
              />
            </div>
          </div>
        </ExpandableToggleCard>

        <ExpandableToggleCard
          label="Add JSON code"
          isExpanded={isJsonCodeOpen}
          onToggle={handleToggleJsonCode}
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
          <div className="flex flex-col gap-csw-md">
            {!!feeJsonError && (
              <span className="text-csw-label-sm text-csw-status-error -mt-[22px]">
                {feeJsonError}
              </span>
            )}
            <TextAreaInput
              value={feeJson}
              state={feeJsonError ? 'error' : 'normal'}
              placeholder="Paste your JSON code here"
              onChange={(value) => {
                setFeeJsonError(undefined);
                setFeeJson(value);
              }}
            />
          </div>
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
            state={mutation.status === 'pending' ? 'loading' : 'default'}
            onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </>
  );
};
