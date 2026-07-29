import { Button } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import { WandShineW700 as WandShine } from '@material-symbols-svg/react-rounded/icons/wand-shine';
import type { ChangeEvent } from 'react';

import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';
import { Toggle } from '@/components/Toggle';

import { cn } from '@/utils';
import { useConfig } from '@/config';
import { fireEvent } from '@/machine';
import { useTypedTranslation } from '@/localisation';
import { useUnsafeSnapshot } from '@/machine/snap';
import { useSupportedChains } from '../../hooks/useSupportedChains';
import { useNotification } from './useNotification';

type Props = {
  error?: string;
  className?: string;
};

export const SendAddress = ({ error, className }: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { sendAddress, hideSendAddress } = useConfig();
  const { supportedChains } = useSupportedChains();

  const notification = useNotification(error);
  const [receiveInMyWallet, setReceiveInMyWallet] = useState<boolean | null>(
    null,
  );

  const showMagicButton =
    ctx.targetToken &&
    !ctx.sendAddress &&
    !!ctx.walletAddress &&
    supportedChains.includes(ctx.targetToken.blockchain);

  const possibleToMyWallet =
    ctx.targetToken &&
    !!ctx.walletAddress &&
    notification?.variant !== 'error' &&
    supportedChains.includes(ctx.targetToken.blockchain);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;

    setReceiveInMyWallet(false);
    fireEvent('addressSet', address);
  };

  // Sync fixed sendAddress with machine state
  useEffect(() => {
    if (sendAddress && sendAddress !== ctx.sendAddress) {
      fireEvent('addressSet', sendAddress);
    }
  }, [sendAddress, ctx.sendAddress]);

  useEffect(() => {
    if (receiveInMyWallet === null && possibleToMyWallet) {
      setReceiveInMyWallet(
        !ctx.sendAddress || ctx.sendAddress === ctx.walletAddress,
      );
    }
  }, [
    receiveInMyWallet,
    possibleToMyWallet,
    ctx.sendAddress,
    ctx.walletAddress,
  ]);

  useEffect(() => {
    if (
      receiveInMyWallet &&
      !possibleToMyWallet &&
      ctx.walletAddress &&
      ctx.sendAddress === ctx.walletAddress
    ) {
      fireEvent('addressSet', '');
    }
  }, [
    receiveInMyWallet,
    possibleToMyWallet,
    ctx.sendAddress,
    ctx.walletAddress,
  ]);

  const inputState = useMemo(() => {
    if (ctx.externalDepositTxReceived) {
      return 'disabled' as const;
    }

    if (!sendAddress) {
      return 'default' as const;
    }

    return notification?.state ?? 'default';
  }, [notification, sendAddress, ctx.externalDepositTxReceived]);

  if (hideSendAddress) {
    return null;
  }

  return (
    <Card
      padding="none"
      className={cn(
        'flex flex-col px-sw-xl py-sw-lg rounded-sw-md',
        className,
      )}>
      <header
        className={cn('flex items-center justify-between w-full', {
          'pb-sw-md': !receiveInMyWallet || notification?.variant !== 'success',
        })}>
        {possibleToMyWallet && (
          <Toggle
            isOn={!!receiveInMyWallet}
            isDisabled={!possibleToMyWallet}
            onToggle={(value) => {
              if (possibleToMyWallet) {
                setReceiveInMyWallet(value);

                if (value) {
                  fireEvent('addressSet', ctx.walletAddress);
                }
              }
            }}
          />
        )}
        <h5
          className={cn('text-sw-label-md text-sw-gray-600 mr-auto!', {
            'ml-sw-md!': possibleToMyWallet,
          })}>
          {possibleToMyWallet
            ? t('sendAddress.myWalletLabel', 'Receive in my wallet')
            : t('sendAddress.label', 'Receive in')}
        </h5>
        {notification && (
          <Banner
            iconPosition="right"
            {...notification}
            message={
              receiveInMyWallet && possibleToMyWallet
                ? 'Compatible'
                : notification.message
            }
          />
        )}
      </header>
      {(!receiveInMyWallet || notification?.variant !== 'success') && (
        <Input
          fontSize="sm"
          defaultValue={ctx.sendAddress}
          state={inputState}
          placeholder={
            possibleToMyWallet
              ? 'or use any other wallet address'
              : t(
                  'wallet.recipient.placeholder',
                  'Enter recipient wallet address',
                )
          }
          onChange={onChange}>
          {!!showMagicButton && (
            <Button
              className="absolute right-0 flex items-center gap-sw-md min-w-max cursor-pointer"
              onClick={() => {
                fireEvent('addressSet', ctx.walletAddress ?? null);
              }}>
              <WandShine size={14} />
              <span className="text-sw-label-md">
                {t('sendAddress.button.magic.label', 'My wallet')}
              </span>
            </Button>
          )}
        </Input>
      )}
    </Card>
  );
};
