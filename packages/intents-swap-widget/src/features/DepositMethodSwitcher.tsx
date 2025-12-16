import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine';

type Props = {
  className?: string;
  children: ({ isExternal }: { isExternal: boolean }) => React.ReactNode;
};

export const DepositMethodSwitcher = ({ children, className }: Props) => {
  const { ctx } = useUnsafeSnapshot();

  const onToggle = (isExternal: boolean) => {
    fireEvent('depositTypeSet', { isExternal });
  };

  return (
    <Card className={cn('gap-sw-2xl p-sw-2xl flex flex-col', className)}>
      <span className="text-sw-label-md text-sw-gray-50">
        Select deposit method
      </span>
      <div className="flex gap-sw-lg">
        <Button
          size="md"
          icon={Icons.Wallet2}
          state={ctx.isDepositFromExternalWallet ? 'default' : 'active'}
          variant={ctx.isDepositFromExternalWallet ? 'outlined' : 'primary'}
          onClick={() => onToggle(false)}>
          My wallet
        </Button>
        <Button
          size="md"
          icon={Icons.QrCode}
          state={ctx.isDepositFromExternalWallet ? 'active' : 'default'}
          variant={ctx.isDepositFromExternalWallet ? 'primary' : 'outlined'}
          onClick={() => onToggle(true)}>
          QR / Address
        </Button>
      </div>

      {children({ isExternal: ctx.isDepositFromExternalWallet })}
    </Card>
  );
};
