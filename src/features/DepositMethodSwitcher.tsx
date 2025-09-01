import * as Icons from 'lucide-react';

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine';

const activeBtnProps = {
  variant: 'tertiary',
  detail: 'dimmed',
  state: 'active',
} as const;

const notActiveBtnProps = {
  variant: 'outlined',
  state: 'default',
} as const;

type Props = {
  children: ({ isExternal }: { isExternal: boolean }) => React.ReactNode;
};

export const DepositMethodSwitcher = ({ children }: Props) => {
  const { ctx } = useUnsafeSnapshot();

  const onToggle = (isExternal: boolean) => {
    fireEvent('depositTypeSet', { isExternal });
  };

  return (
    <Card className="gap-sw-2xl p-sw-2xl flex flex-col">
      <span className="text-label-m text-gray-50">Select deposit method</span>
      <div className="flex gap-sw-lg">
        <Button
          size="md"
          icon={Icons.Wallet2}
          onClick={() => onToggle(false)}
          {...(!ctx.isDepositFromExternalWallet
            ? activeBtnProps
            : notActiveBtnProps)}>
          My wallet
        </Button>
        <Button
          size="md"
          icon={Icons.QrCode}
          onClick={() => onToggle(true)}
          {...(ctx.isDepositFromExternalWallet
            ? activeBtnProps
            : notActiveBtnProps)}>
          QR / Address
        </Button>
      </div>

      {children({ isExternal: ctx.isDepositFromExternalWallet })}
    </Card>
  );
};
