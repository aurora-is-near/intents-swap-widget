import { QrCodeW700 as QrCodeIcon } from '@material-symbols-svg/react-rounded/icons/qr-code';
import { ProgressActivityW700 as ProgressActivity } from '@material-symbols-svg/react-rounded/icons/progress-activity';

import { cn } from '@/utils/cn';
import { Card } from '@/components/Card';
import { Steps } from '@/components/Steps';
import { Toggle } from '@/components/Toggle';
import { ExternalDeposit } from '@/features/ExternalDeposit';
import { TokenSelectButton } from '@/components/TokenSelectButton';
import { useTypedTranslation } from '@/localisation';
import { useUnsafeSnapshot } from '@/machine/snap';
import { guardStates } from '@/machine/guards';
import { fireEvent } from '@/machine';

import type { TransferResult } from '@/types/transfer';

type Msg =
  | { type: 'on_transaction_received' }
  | { type: 'on_toggle_tokens_modal'; isOpen: boolean }
  | { type: 'on_successful_transfer'; transferResult: TransferResult };

type Props = {
  className?: string;
  onMsg: (msg: Msg) => void;
};

const ExtendedContent = ({ onMsg }: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();

  const isValidState = guardStates(ctx, [
    'initial_wallet',
    'input_valid_internal',
    'quote_success_internal',
  ]);

  if (!isValidState) {
    return null;
  }

  return (
    <Steps className="pt-sw-2xl">
      <Steps.Step
        stepNumber={1}
        title={t(
          'deposit.external.stepSelectToken.title',
          'Select token to deposit',
        )}
        description={t(
          'deposit.external.stepSelectToken.description',
          'Make sure you send exactly this token',
        )}
        asideElement={
          <TokenSelectButton
            token={ctx.sourceToken}
            onClick={() =>
              onMsg({ type: 'on_toggle_tokens_modal', isOpen: true })
            }
          />
        }
      />
      <Steps.Step
        stepNumber={2}
        title={t('deposit.external.stepAddress.title', 'Send to address')}
        description={
          ctx.sourceToken
            ? `Use ${ctx.sourceToken.chainName} network`
            : "Use selected token's network"
        }
        asideElement={(() => {
          switch (ctx.quoteStatus) {
            case 'error':
            case 'success':
              return null;
            case 'idle':
            case 'pending':
            default:
              return (
                <span className="animate-spin">
                  <ProgressActivity size={24} className="text-sw-gray-200" />
                </span>
              );
          }
        })()}>
        {ctx.quoteStatus === 'success' && <ExternalDeposit onMsg={onMsg} />}
      </Steps.Step>
    </Steps>
  );
};

export const DepositMethodSwitcher = ({ className, onMsg }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();

  const canBeToggled =
    !!ctx.sourceToken && !ctx.sourceToken.isIntent && !!ctx.walletAddress;

  const onToggle = (isExternal: boolean) => {
    if (!canBeToggled) {
      return;
    }

    fireEvent('depositTypeSet', { isExternal });
  };

  return (
    <Card
      className={cn(
        'flex flex-col',
        { 'pb-sw-lg': ctx.isDepositFromExternalWallet },
        className,
      )}>
      <header className="gap-sw-md flex items-center justify-between">
        <QrCodeIcon size={16} className="text-sw-gray-200" />
        <span className="text-sw-label-md text-sw-gray-200 mr-auto">
          {t('deposit.method.switcher.label', 'Deposit from external wallet')}
        </span>
        <Toggle
          isOn={ctx.isDepositFromExternalWallet}
          isDisabled={!canBeToggled}
          onToggle={onToggle}
        />
      </header>

      {ctx.isDepositFromExternalWallet && <ExtendedContent onMsg={onMsg} />}
    </Card>
  );
};
