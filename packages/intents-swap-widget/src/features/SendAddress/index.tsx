import { Button } from '@headlessui/react';
import { useEffect, useMemo } from 'react';
import { WandShineW700 as WandShine } from '@material-symbols-svg/react-rounded/icons/wand-shine';
import type { ChangeEvent } from 'react';

import { useNotification } from './useNotification';
import { useSupportedChains } from '../../hooks/useSupportedChains';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';

import { cn } from '@/utils';
import { useConfig } from '@/config';
import { fireEvent } from '@/machine';
import { useTypedTranslation } from '@/localisation';
import { useUnsafeSnapshot } from '@/machine/snap';

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

  const showMagicButton =
    ctx.targetToken &&
    !ctx.sendAddress &&
    supportedChains.includes(ctx.targetToken.blockchain);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;

    fireEvent('addressSet', address);
  };

  // Sync fixed sendAddress with machine state
  useEffect(() => {
    if (sendAddress && sendAddress !== ctx.sendAddress) {
      fireEvent('addressSet', sendAddress);
    }
  }, [sendAddress, ctx.sendAddress]);

  const inputState = useMemo(() => {
    if (sendAddress) {
      return 'fixed' as const;
    }

    return notification?.state ?? 'default';
  }, [notification, sendAddress]);

  if (hideSendAddress) {
    return null;
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <h5 className="text-sw-label-md text-sw-gray-50 mb-sw-2xl">
        {t('sendAddress.label', 'Send to')}
      </h5>
      <Input
        fontSize="sm"
        defaultValue={ctx.sendAddress}
        state={inputState}
        className="mb-sw-xl"
        placeholder={t(
          'wallet.recipient.placeholder',
          'Enter recipient wallet address',
        )}
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

      {notification && <Banner {...notification} />}
    </Card>
  );
};
