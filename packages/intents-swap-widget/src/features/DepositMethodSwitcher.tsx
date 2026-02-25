import { Children, Fragment } from 'react';
import { QrCodeW700 as QrCodeIcon } from '@material-symbols-svg/react-rounded/icons/qr-code';
import { ProgressActivityW700 as ProgressActivity } from '@material-symbols-svg/react-rounded/icons/progress-activity';
import type { PropsWithChildren, ReactNode } from 'react';

import { cn } from '@/utils/cn';
import { Hr } from '@/components/Hr';
import { Card } from '@/components/Card';
import { Toggle } from '@/components/Toggle';
import { CopyButton } from '@/components/CopyButton';
import { ExternalDeposit } from '@/features/ExternalDeposit';
import { TokenSelectButton } from '@/components/TokenSelectButton';
import { useTypedTranslation } from '@/localisation';
import { useUnsafeSnapshot } from '@/machine/snap';
import { guardStates } from '@/machine/guards';
import { fireEvent } from '@/machine';

import { formatAddressTruncate } from '@/utils/formatters/formatAddressTruncate';
import type { TransferResult } from '@/types/transfer';

type Msg =
  | { type: 'on_transaction_received' }
  | { type: 'on_toggle_tokens_modal'; isOpen: boolean }
  | { type: 'on_successful_transfer'; transferResult: TransferResult };

type Props = {
  className?: string;
  onMsg: (msg: Msg) => void;
};

type StepProps = PropsWithChildren<{
  stepNumber: number;
  title: ReactNode;
  description: ReactNode;
  asideElement?: ReactNode;
}>;

const StepWrapper = ({ children }: PropsWithChildren) => {
  return <div className="flex flex-col gap-y-sw-xl">{children}</div>;
};

const Step = ({
  title,
  description,
  stepNumber,
  asideElement,
  children,
}: StepProps) => {
  const Wrapper = children ? StepWrapper : Fragment;

  return (
    <Wrapper>
      <div className="flex items-center justify-between py-sw-md">
        <span className="flex items-center justify-center gap-y-sw-lg h-[28px] w-[28px] rounded-full bg-sw-gray-50 text-gray-950 text-sw-label-sm">
          {stepNumber}
        </span>
        <div className="flex flex-col gap-sw-xs mr-auto ml-sw-lg">
          <span className="text-sw-label-md text-sw-gray-50">{title}</span>
          <span className="text-sw-label-sm text-sw-gray-200">
            {description}
          </span>
        </div>

        {asideElement}
      </div>
      {children}
    </Wrapper>
  );
};

const Steps = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode[];
}) => {
  return (
    <section className={cn('flex flex-col gap-sw-sm', className)}>
      {Children.map(children, (child) => (
        <>
          <Hr />
          {child}
        </>
      ))}
    </section>
  );
};

const DepositAddressAndQrCode = ({ onMsg }: Pick<Props, 'onMsg'>) => {
  const { ctx } = useUnsafeSnapshot();

  const isValidState = guardStates(ctx, ['quote_success_internal']);

  if (!isValidState) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-sw-lg">
      <div className="py-sw-lg px-sw-lg w-full flex items-center justify-between rounded-sw-md bg-sw-gray-800">
        <span className="text-sw-label-md text-sw-gray-100">
          {formatAddressTruncate(ctx.quote.depositAddress, 38)}
        </span>
        <CopyButton value={ctx.quote.depositAddress} />
      </div>
      <ExternalDeposit onMsg={onMsg} />
    </div>
  );
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
      <Step
        stepNumber={1}
        title={t(
          'deposit.external.stepSelectToken.title',
          'Select token to deposit',
        )}
        description={t(
          'deposit.external.stepSelectToken.description',
          'Make sure you have enough funds',
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
      <Step
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
        {ctx.quoteStatus === 'success' && (
          <DepositAddressAndQrCode onMsg={onMsg} />
        )}
      </Step>
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
