import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Copy, CheckCircle } from 'lucide-react';

import { paymentLinkSchema, type PaymentLinkFormValues } from './schema';
import { usePaymentLink } from './usePaymentLink';
import { AssetField } from './AssetField';
import { PaymentView } from './PaymentView';

import { clsx } from 'clsx';
import { Button } from '@/uikit/Button';
import { TextInput } from '@/uikit/TextInput';
import { TextAreaInput } from '@/uikit/TextAreaInput';

const AmountInput = ({
  value = '',
  state = 'normal',
  placeholder,
  onChange,
}: {
  value?: string;
  placeholder: string;
  state?: 'normal' | 'error';
  onChange: (value: string) => void;
}) => (
  <div className="flex-shrink-0">
    <div
      className={clsx(
        'flex gap-csw-md items-center px-csw-xl py-csw-lg rounded-csw-md',
        {
          'bg-csw-gray-800': state === 'normal',
          'bg-csw-status-error/20': state === 'error',
        },
      )}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className={clsx(
          'bg-transparent outline-none flex-1 font-semibold leading-5',
          'text-[17px]',
          {
            'text-csw-gray-50 placeholder-csw-gray-300': state === 'normal',
            'text-csw-status-error placeholder-csw-status-error':
              state === 'error',
          },
        )}
      />
    </div>
  </div>
);

const defaultValues: PaymentLinkFormValues = {
  asset: { symbol: '', blockchain: '' },
  amount: '',
  recipient: '',
  description: '',
};

export const PaymentLinks = () => {
  // When all required payment params are present, show the payment view
  const paymentParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const asset = params.get('asset');
    const chain = params.get('chain');
    const amount = params.get('amount');
    const recipient = params.get('recipient');
    const description = params.get('description');

    if (asset && chain && amount && recipient) {
      return { asset, chain, amount, recipient, description: description ?? undefined };
    }
    return null;
  }, []);

  const { generatedLink, generateLink, copyLink, copyFeedback } =
    usePaymentLink();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentLinkFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    resolver: zodResolver(paymentLinkSchema),
    defaultValues,
  });

  // Pre-fill form from URL query params (only when not showing payment view)
  useEffect(() => {
    if (paymentParams) return;

    const params = new URLSearchParams(window.location.search);
    const asset = params.get('asset');
    const chain = params.get('chain');
    const amount = params.get('amount');
    const recipient = params.get('recipient');
    const description = params.get('description');

    if (asset && chain) {
      reset({
        asset: { symbol: asset, blockchain: chain },
        amount: amount ?? '',
        recipient: recipient ?? '',
        description: description ?? '',
      });
    }
  }, [reset, paymentParams]);

  const onSubmit = (data: PaymentLinkFormValues) => {
    generateLink(data);
  };

  if (paymentParams) {
    return <PaymentView {...paymentParams} />;
  }

  return (
    <div className="flex flex-1 items-start justify-center px-csw-2xl py-csw-2xl sm:py-csw-10xl">
      <div className="w-full max-w-[480px] bg-csw-gray-950 rounded-csw-lg p-csw-2xl sm:p-csw-3xl flex flex-col gap-csw-2xl">
        <div className="flex items-center gap-csw-md">
          <Link size={20} className="text-csw-gray-100" />
          <h1 className="text-lg font-semibold text-csw-gray-50 tracking-[-0.4px]">
            Payment Links
          </h1>
        </div>

        <p className="text-sm text-csw-gray-200">
          Create a shareable payment link with pre-filled asset, amount, and
          recipient details.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-csw-2xl">
          {/* Asset */}
          <div className="flex flex-col gap-csw-2md">
            <div className="flex items-center justify-between">
              <span className="text-csw-label-md text-csw-gray-50">Asset</span>
              {errors.asset?.symbol && (
                <span className="text-csw-label-sm text-csw-status-error">
                  {errors.asset.symbol.message}
                </span>
              )}
            </div>
            <Controller
              name="asset"
              control={control}
              render={({ field }) => (
                <AssetField
                  value={field.value}
                  state={errors.asset?.symbol ? 'error' : 'normal'}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-csw-2md">
            <div className="flex items-center justify-between">
              <span className="text-csw-label-md text-csw-gray-50">
                Amount
              </span>
              {errors.amount && (
                <span className="text-csw-label-sm text-csw-status-error">
                  {errors.amount.message}
                </span>
              )}
            </div>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <AmountInput
                  value={field.value}
                  state={errors.amount ? 'error' : 'normal'}
                  placeholder="0.00"
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Recipient */}
          <div className="flex flex-col gap-csw-2md">
            <div className="flex items-center justify-between">
              <span className="text-csw-label-md text-csw-gray-50">
                Recipient address
              </span>
              {errors.recipient && (
                <span className="text-csw-label-sm text-csw-status-error">
                  {errors.recipient.message}
                </span>
              )}
            </div>
            <Controller
              name="recipient"
              control={control}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  state={errors.recipient ? 'error' : 'normal'}
                  placeholder="Enter wallet address"
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-csw-2md">
            <div className="flex items-center justify-between">
              <span className="text-csw-label-md text-csw-gray-50">
                Description{' '}
                <span className="text-csw-gray-300">(optional)</span>
              </span>
              {errors.description && (
                <span className="text-csw-label-sm text-csw-status-error">
                  {errors.description.message}
                </span>
              )}
            </div>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextAreaInput
                  value={field.value}
                  state={errors.description ? 'error' : 'normal'}
                  placeholder="What is this payment for?"
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <Button size="md" variant="primary" detail="accent" onClick={handleSubmit(onSubmit)}>
            Generate Payment Link
          </Button>
        </form>

        {/* Generated link display */}
        {generatedLink && (
          <div className="flex flex-col gap-csw-md border-t border-csw-gray-900 pt-csw-2xl">
            <span className="text-csw-label-md text-csw-gray-50">
              Your payment link
            </span>
            <div className="flex items-center gap-csw-md">
              <div className="flex-1 bg-csw-gray-800 rounded-csw-md px-csw-lg py-csw-md overflow-hidden">
                <p className="text-sm text-csw-gray-200 truncate font-mono">
                  {generatedLink}
                </p>
              </div>
              <button
                type="button"
                onClick={copyLink}
                className={`flex items-center gap-csw-md px-csw-lg py-csw-md rounded-csw-md cursor-pointer transition-colors whitespace-nowrap font-semibold text-xs ${
                  copyFeedback
                    ? 'bg-csw-status-success/10 text-csw-status-success'
                    : 'bg-csw-accent-500 hover:bg-csw-accent-400 text-csw-gray-950'
                }`}>
                {copyFeedback ? (
                  <>
                    <CheckCircle size={14} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
