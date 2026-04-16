import { z } from 'zod/v3';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { FeeInput } from './FeeInput';
import { FeesSummary } from './FeesSummary';

import { NestedHeader } from '../components';
import {
  getBasicFeeConfig,
  getBasisPointsFromPercent,
  getFeeShare,
  getPercentFromBasisPoints,
  getRecipientErrorFromJson,
  getSimpleValueBasedFee,
  isZeroValueBasedFee,
  validateFeeConfig,
} from '../utils';

import { Button } from '@/uikit/Button';
import { TextInput } from '@/uikit/TextInput';
import { TextAreaInput } from '@/uikit/TextAreaInput';
import { ExpandableToggleCard } from '@/uikit/ToggleCard';
import { useUpdateApiKey } from '@/api/hooks';
import { DEFAULT_ZERO_FEE } from '@/constants';
import type { ApiKey } from '@/api/types';

const formSchema = z
  .object({
    walletAddress: z.string().min(1, 'Wallet address is required'),
    customFee: z.string().min(0.00001, 'Custom fee is required'),
    feeJson: z.string().min(1, 'JSON configuration is required'),
  })
  .superRefine(({ feeJson }, ctx) => {
    const { error } = validateFeeConfig(feeJson);

    if (!error) {
      return;
    }

    ctx.addIssue({
      code: 'custom',
      path: ['feeJson'],
      message: error,
    });

    const walletAddressError = getRecipientErrorFromJson(error);

    if (walletAddressError) {
      ctx.addIssue({
        code: 'custom',
        path: ['walletAddress'],
        message: walletAddressError,
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

type Props = {
  apiKey: ApiKey;
  onClickBack: () => void;
};

export const Fees = ({ apiKey, onClickBack }: Props) => {
  // value based fee
  const valueBasedFee = getSimpleValueBasedFee(apiKey.feeRules);
  const [hasConfigAssetRules, setHasConfigAssetRules] = useState(
    apiKey.feeRules.rules.length > 0,
  );

  const [isCustomFeeOpen, setIsCustomFeeOpen] = useState(
    // means only default fee is set
    apiKey.feeRules.rules.length === 0 && !isZeroValueBasedFee(apiKey.feeRules),
  );

  // means fee config has been loaded from JSON
  // because there is no UI to provide detail configuration
  const isFeeConfigSetAsJson = apiKey.feeRules.rules.length > 0;
  const [isJsonCodeOpen, setIsJsonCodeOpen] = useState(isFeeConfigSetAsJson);

  const {
    watch,
    control,
    setError,
    setValue,
    clearErrors,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    resolver: zodResolver(formSchema),
    defaultValues: {
      walletAddress: valueBasedFee?.recipient ?? '',
      feeJson: JSON.stringify(apiKey.feeRules, null, 2),
      customFee: valueBasedFee?.bps
        ? getPercentFromBasisPoints(valueBasedFee.bps)
        : '0',
    },
  });

  const customFee = watch('customFee');
  const walletAddress = watch('walletAddress');
  const feeJson = watch('feeJson');

  const { mutate: updateApiKey, ...mutation } = useUpdateApiKey(
    apiKey.widgetApiKey,
  );

  const handleFeeJsonChange = (fee: string) => {
    const { data: config, error } = validateFeeConfig(fee);

    if (!error) {
      clearErrors('feeJson');
      setHasConfigAssetRules((config?.rules.length ?? 0) > 0);
    } else {
      setError('feeJson', { message: error });
    }
  };

  const syncCustomFeeInputsFromJson = (fee: string) => {
    const { data: config, error } = validateFeeConfig(fee);

    if (error !== undefined || !config) {
      return false;
    }

    clearErrors('walletAddress');

    setValue('walletAddress', config.default_fee.recipient);
    setValue('customFee', getPercentFromBasisPoints(config.default_fee.bps));

    return true;
  };

  const handleToggleCustomFee = (isOpen: boolean) => {
    if (isOpen) {
      syncCustomFeeInputsFromJson(feeJson);
    }

    setIsCustomFeeOpen(isOpen);
    setHasConfigAssetRules(false);

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

  const handleSave = (data: FormValues) => {
    const { data: rules, error } = validateFeeConfig(data.feeJson);

    if (error) {
      setError('feeJson', { message: error });

      return;
    }

    updateApiKey({
      isEnabled: true,
      feeRules: rules ?? DEFAULT_ZERO_FEE,
    });
  };

  const handleSubmitForm = () => {
    // omit validation if both toggles are off
    if (!isCustomFeeOpen && !isJsonCodeOpen) {
      return updateApiKey({
        isEnabled: true,
        feeRules: DEFAULT_ZERO_FEE,
      });
    }

    void handleSubmit(handleSave)();
  };

  useEffect(() => {
    // we already handle parsing errors on the client side
    // no need to parse them from the server (it's not possible to submit invalid JSON)
    if (mutation.status === 'error') {
      setError('feeJson', { message: 'Unable to update custom fees' });
    } else {
      clearErrors('feeJson');

      if (mutation.status === 'success') {
        onClickBack();
      }
    }
  }, [mutation.status]);

  // sync values from custom fee inputs to fee JSON
  useEffect(() => {
    if (isCustomFeeOpen) {
      setValue(
        'feeJson',
        JSON.stringify(
          getBasicFeeConfig(
            getBasisPointsFromPercent(customFee),
            walletAddress,
          ),
          null,
          2,
        ),
      );
    }
  }, [customFee, walletAddress, isCustomFeeOpen]);

  // sync values from fee JSON to custom fee
  useEffect(() => {
    if (isJsonCodeOpen) {
      syncCustomFeeInputsFromJson(feeJson);
    }
  }, [feeJson, isJsonCodeOpen]);

  return (
    <>
      <NestedHeader onClickBack={onClickBack} title="Edit fees" />

      <div className="flex flex-col gap-csw-2xl my-csw-2xl">
        <ExpandableToggleCard
          label="Add custom fee"
          isExpanded={isCustomFeeOpen}
          onToggle={handleToggleCustomFee}
          description={
            <>
              Set up optional custom fees added on top of the protocol fee.{' '}
              <br className="hidden sm:block" />
              You earn 60% of your custom fee; Aurora retain 40% (min 0.02%).
            </>
          }>
          <div className="flex flex-col gap-csw-2xl">
            <div className="flex flex-col gap-csw-md">
              {!!errors.customFee && (
                <span className="text-csw-label-sm text-csw-status-error -mt-[22px]">
                  {errors.customFee.message}
                </span>
              )}
              <Controller
                name="customFee"
                control={control}
                render={({ field }) => (
                  <FeeInput
                    suffix="1.00% max"
                    placeholder="0.00%"
                    state={errors.customFee ? 'error' : 'normal'}
                    value={field.value || ''}
                    onChange={(value) => {
                      clearErrors('customFee');
                      field.onChange(value);
                    }}
                  />
                )}
              />
              <ul className="flex flex-col gap-csw-sm mt-csw-md">
                {(() => {
                  const { auroraBps, clientBps, feeBps } = getFeeShare(
                    customFee || '0',
                  );

                  const auroraPortion = feeBps
                    ? Math.round((auroraBps / feeBps) * 100)
                    : 0;

                  const clientPortion = feeBps
                    ? Math.round((clientBps / feeBps) * 100)
                    : 0;

                  return (
                    <>
                      <li className="flex items-center justify-between text-csw-label-sm">
                        <span className="text-csw-gray-300">
                          Aurora fee (min 0.02%)
                        </span>
                        <span className="text-csw-gray-50">
                          {getPercentFromBasisPoints(auroraBps)}% (
                          {auroraPortion}%)
                        </span>
                      </li>
                      <li className="flex items-center justify-between text-csw-label-sm">
                        <span className="text-csw-gray-300">Your share</span>
                        <span className="text-csw-accent-500">
                          {getPercentFromBasisPoints(clientBps)}% (
                          {clientPortion}%)
                        </span>
                      </li>
                    </>
                  );
                })()}
              </ul>
            </div>

            <div className="flex flex-col gap-csw-2md">
              <div className="flex items-center justify-between">
                <span className="text-csw-label-md text-csw-gray-50">
                  Your fee recipient address
                </span>
                {!!errors.walletAddress && (
                  <span className="text-csw-label-sm text-csw-status-error">
                    {errors.walletAddress.message}
                  </span>
                )}
              </div>
              <Controller
                name="walletAddress"
                control={control}
                render={({ field }) => (
                  <TextInput
                    state={errors.walletAddress ? 'error' : 'normal'}
                    placeholder="Enter wallet address"
                    value={field.value}
                    onChange={(value) => {
                      clearErrors('walletAddress');
                      field.onChange(value);
                    }}
                  />
                )}
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
            {!!errors.feeJson && (
              <span className="text-csw-label-sm text-csw-status-error -mt-[22px]">
                {errors.feeJson.message}
              </span>
            )}
            <Controller
              name="feeJson"
              control={control}
              render={({ field }) => (
                <TextAreaInput
                  value={field.value}
                  state={errors.feeJson ? 'error' : 'normal'}
                  placeholder="Paste your JSON code here"
                  onChange={(value) => {
                    clearErrors('feeJson');
                    handleFeeJsonChange(value);
                    field.onChange(value);
                  }}
                />
              )}
            />
          </div>
        </ExpandableToggleCard>

        <FeesSummary
          customFee={isCustomFeeOpen || isJsonCodeOpen ? customFee : '0'}
          isValueBasedFee={!hasConfigAssetRules}
        />

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
            onClick={handleSubmitForm}>
            Save
          </Button>
        </div>
      </div>
    </>
  );
};
