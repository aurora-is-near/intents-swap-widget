import { QrCodeW700 as QrCodeIcon } from '@material-symbols-svg/react-rounded/icons/qr-code';
import { ProgressActivityW700 as ProgressActivity } from '@material-symbols-svg/react-rounded/icons/progress-activity';
import { RefreshW700 as RefreshIcon } from '@material-symbols-svg/react-rounded/icons/refresh';

import { cn } from '@/utils/cn';
import { Card } from '@/components/Card';
import { Steps } from '@/components/Steps';
import { Toggle } from '@/components/Toggle';
import { Button } from '@/components/Button';
import { Tooltip } from '@/components/Tooltip';
import { ExternalDeposit } from '@/features/ExternalDeposit';
import { TokenSelectButton } from '@/components/TokenSelectButton';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { useTypedTranslation } from '@/localisation';
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
  const { minDepositTokenAmount } = useComputedSnapshot();

  const isValidState = guardStates(ctx, [
    'initial_wallet',
    'input_valid_internal',
    'quote_success_internal',
  ]);

  if (!isValidState) {
    return null;
  }

  // limit minimum deposit amount to 1 USD to avoid FLEX_INPUT quote failure
  const minDepositAmount = ctx.sourceToken
    ? formatBigToHuman(minDepositTokenAmount, ctx.sourceToken.decimals)
    : 0;

  return (
    <Steps className="pt-sw-2xl">
      <Steps.Step
        title={t(
          'deposit.external.stepSelectToken.title',
          'Select token to deposit',
        )}
        description={
          ctx.sourceToken
            ? `Minimum deposit ${minDepositAmount} ${ctx.sourceToken.symbol}`
            : 'You can send any amount of this token'
        }
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
        title={`Send ${ctx.sourceToken ? `${ctx.sourceToken?.symbol} ` : ''}to address`}
        description={
          ctx.sourceToken
            ? `Use ${ctx.sourceToken.chainName} network`
            : "Use selected token's network"
        }
        asideElement={(() => {
          switch (ctx.quoteStatus) {
            case 'idle':
            case 'success':
              // to avoid step container height jump on switching between error and loading state
              return <span className="h-[36px]" />;
            case 'error':
              return (
                <Button
                  size="md"
                  variant="primary"
                  className="w-fit py-sw-sm px-sw-lg"
                  onClick={() => fireEvent('quoteReset', null)}>
                  <RefreshIcon size={16} />
                  {t('deposit.external.stepSelectToken.retry', 'Try again')}
                </Button>
              );
            case 'pending':
            default:
              return (
                <div className="flex items-center justify-center h-[36px]">
                  <span className="animate-spin">
                    <ProgressActivity size={24} className="text-sw-gray-200" />
                  </span>
                </div>
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
    ((!!ctx.sourceToken && !ctx.sourceToken.isIntent) || !ctx.sourceToken) &&
    !!ctx.walletAddress;

  const onToggle = (isExternal: boolean) => {
    if (!canBeToggled) {
      return;
    }

    fireEvent('externalDepositTxSet', undefined);
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
        <span className="text-sw-label-md text-sw-gray-200">
          {t('deposit.method.switcher.label', 'Deposit from external wallet')}
        </span>
        <Tooltip className="mr-auto">
          {t(
            'deposit.external.tooltip.text',
            'Generate a deposit address and QR code to fund your account. Send any amount of the selected asset and it will be credited to your Intents balance.',
          )}
        </Tooltip>
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
