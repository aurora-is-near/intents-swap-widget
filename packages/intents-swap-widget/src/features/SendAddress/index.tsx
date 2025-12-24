import { Button } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { WandShine } from '@material-symbols-svg/react-rounded/w700';
import type { ChangeEvent } from 'react';

import { useNotification } from './useNotification';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';

import { cn } from '@/utils';
import { useConfig } from '@/config';
import { fireEvent } from '@/machine';
import { useTypedTranslation } from '@/localisation';
import { useUnsafeSnapshot } from '@/machine/snap';

type Msg = { type: 'on_change_send_address'; address: string };

type Props = {
  error?: string;
  className?: string;
  onMsg: (msg: Msg) => void;
};

export const SendAddress = ({ error, className, onMsg }: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { walletSupportedChains, sendAddress, hideSendAddress } = useConfig();

  const [value, setValue] = useState(ctx.sendAddress ?? '');
  const [debouncedValue] = useDebounce(value, 700);

  const notification = useNotification(error);

  const showMagicButton =
    ctx.targetToken &&
    !ctx.sendAddress &&
    walletSupportedChains.includes(ctx.targetToken.blockchain);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;

    setValue(address);
  };

  // Sync fixed sendAddress with machine state
  useEffect(() => {
    if (sendAddress && sendAddress !== ctx.sendAddress) {
      fireEvent('addressSet', sendAddress);
    }
  }, [sendAddress, ctx.sendAddress]);

  useEffect(() => {
    const address = debouncedValue ?? value;

    fireEvent('addressSet', address);
    onMsg({ type: 'on_change_send_address', address });
  }, [debouncedValue]);

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
            onClick={() => fireEvent('addressSet', ctx.walletAddress ?? '')}>
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
