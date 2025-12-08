import * as Icons from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';

import { useNotification } from './useNotification';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';
import { Badge } from '@/components/Badge';

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
  }, [debouncedValue, value]);

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
    <Card className={cn('gap-sw-lg flex flex-col', className)}>
      <h5 className="text-sw-label-m text-sw-gray-50">Send to</h5>
      <Input
        defaultValue={ctx.sendAddress}
        state={inputState}
        placeholder={t(
          'wallet.recipient.placeholder',
          'Enter recipient wallet address',
        )}
        onChange={onChange}>
        {!!showMagicButton && (
          <Badge
            isClickable
            size="md"
            variant="primary"
            className="absolute right-0"
            onClick={() => fireEvent('addressSet', ctx.walletAddress ?? '')}>
            <Icons.Wand2 size={12} />
            My wallet
          </Badge>
        )}
      </Input>

      {notification && <Banner {...notification} />}
    </Card>
  );
};
