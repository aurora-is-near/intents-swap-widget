import * as Icons from 'lucide-react';
import type { ChangeEvent } from 'react';

import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';
import { Badge } from '@/components/Badge';

import { useConfig } from '@/config';
import { fireEvent } from '@/machine';
import { useUnsafeSnapshot } from '@/machine/snap';

import { useNotification } from './useNotification';

type Msg = { type: 'on_change_send_address'; address: string };

type Props = {
  error?: string;
  onMsg: (msg: Msg) => void;
};

export const SendAddress = ({ error, onMsg }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { walletSupportedChains } = useConfig();

  const notification = useNotification(error);

  const showMagicButton =
    ctx.targetToken &&
    !ctx.sendAddress &&
    walletSupportedChains.includes(ctx.targetToken.blockchain);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;

    fireEvent('addressSet', address);
    onMsg({ type: 'on_change_send_address', address });
  };

  return (
    <Card className="gap-sw-lg flex flex-col">
      <h5 className="text-sw-label-m text-sw-gray-50">Send to</h5>
      <Input
        defaultValue={ctx.sendAddress}
        state={notification?.state ?? 'default'}
        placeholder="Enter recipient wallet address"
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
