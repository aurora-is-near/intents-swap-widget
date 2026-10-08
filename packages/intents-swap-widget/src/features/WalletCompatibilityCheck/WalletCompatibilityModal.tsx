import { AccountBalanceWalletFillW700 as AccountBalanceWalletFill } from '@material-symbols-svg/react-rounded/icons/account-balance-wallet';
import { ArmingCountdownFillW700 as ArmingCountdownFill } from '@material-symbols-svg/react-rounded/icons/arming-countdown';
import { BeenhereFillW700 as BeenhereFill } from '@material-symbols-svg/react-rounded/icons/beenhere';
import { CheckCircleFillW700 as CheckCircleFill } from '@material-symbols-svg/react-rounded/icons/check-circle';
import { EncryptedFillW700 as EncryptedFill } from '@material-symbols-svg/react-rounded/icons/encrypted';
import { GppBadFillW700 as GppBadFill } from '@material-symbols-svg/react-rounded/icons/gpp-bad';
import type { MaterialSymbolsComponent } from '@material-symbols-svg/react-rounded';

import { useTimer } from 'use-timer';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useTypedTranslation } from '@/localisation';

import { cn } from '@/utils';
import { useHandleKeyDown } from '@/hooks';
import { Button, Card, CloseButton } from '@/components';

type Msg = { type: 'on_close' | 'on_check_compatibility' | 'on_sign_out' };
type MsgError = { type: 'on_close' | 'on_try_again' | 'on_sign_out' };

/** Layout options for hosts that show the check as a full screen. */
export interface LayoutProps {
  /** Hides the close button and disables closing with Escape. */
  hideCloseButton?: boolean;
  /** Fills the parent's height, with the actions pinned to the bottom. */
  isFullHeight?: boolean;
  /** Rendered above the icon, e.g. the wallet being verified. */
  header?: ReactNode;
}

interface Props extends LayoutProps {
  isSigned: boolean;
  isSigning: boolean;
  onMsg: (msg: Msg) => void;
}

const cardClassName = (isFullHeight?: boolean) =>
  cn('relative w-full gap-sw-2xl flex flex-col', {
    'h-full min-h-full flex-1': isFullHeight,
  });

// Either margin, not both: cn doesn't resolve mt-sw-lg against mt-auto.
const actionsClassName = (isFullHeight?: boolean) =>
  cn(
    'flex flex-col gap-sw-xl w-full',
    isFullHeight ? 'mt-auto pt-sw-lg' : 'mt-sw-lg',
  );

const ListItem = ({
  text,
  icon: Icon,
}: {
  text: string;
  icon: MaterialSymbolsComponent;
}) => (
  <li className="flex items-center gap-sw-md">
    {Icon && <Icon size={20} className="text-sw-gray-300" />}
    <span className="text-sw-label-md text-sw-gray-50">{text}</span>
  </li>
);

const FakeButton = ({
  label,
  icon: Icon,
  className,
}: {
  label: string;
  icon?: MaterialSymbolsComponent;
  className?: string;
}) => (
  <div
    className={cn(
      'rounded-sw-lg flex align-center justify-center gap-sw-md w-full py-sw-2xl',
      className,
    )}>
    {Icon && <Icon size={16} />}
    <span className="text-sw-label-md">{label}</span>
  </div>
);

export const Initial = ({
  isSigned,
  isSigning,
  onMsg,
  hideCloseButton,
  isFullHeight,
  header,
}: Props) => {
  const { t } = useTypedTranslation();
  const handleClose = () => onMsg({ type: 'on_close' });

  useHandleKeyDown('Escape', handleClose, [], { enabled: !hideCloseButton });

  const showTimer = useTimer({
    endTime: 0,
    autostart: false,
    timerType: 'DECREMENTAL',
    initialTime: 7,
    onTimeOver: handleClose,
  });

  useEffect(() => {
    if (isSigned) {
      showTimer.start();
    } else {
      showTimer.reset();
    }
  }, [isSigned]);

  return (
    <Card className={cardClassName(isFullHeight)}>
      {!hideCloseButton && (
        <CloseButton
          onClick={handleClose}
          className="absolute top-sw-2xl right-sw-2xl"
        />
      )}
      {header}
      <ArmingCountdownFill size={48} className="text-sw-status-warning" />

      <header className="flex flex-col gap-sw-lg">
        <h1 className="text-sw-label-lg text-sw-gray-50">
          {t(
            'walletCompatibility.modal.title.initial',
            'Verify your wallet to continue',
          )}
        </h1>
        <p className="text-sw-body-md text-sw-gray-200">
          {t(
            'walletCompatibility.modal.description.initial',
            'Please sign a message to verify your wallet. This confirms your wallet is compatible and lets us securely read your public key.',
          )}
        </p>
      </header>

      <ul className="flex flex-col gap-sw-xl">
        <ListItem
          text={t(
            'walletCompatibility.modal.feature.secureTransactions',
            'Read-only signature – no gas required.',
          )}
          icon={BeenhereFill}
        />
        <ListItem
          text={t(
            'walletCompatibility.modal.feature.fullAccess',
            'No access to your funds, no hidden permissions.',
          )}
          icon={EncryptedFill}
        />
        <ListItem
          text={t(
            'walletCompatibility.modal.feature.fundProtection',
            'Only checks whether your wallet is supported.',
          )}
          icon={AccountBalanceWalletFill}
        />
      </ul>

      {isSigned ? (
        <div className={actionsClassName(isFullHeight)}>
          <FakeButton
            label={t(
              'walletCompatibility.modal.button.verified',
              'Wallet verified',
            )}
            className="bg-sw-status-success text-sw-gray-950"
            icon={CheckCircleFill}
          />
          {showTimer.status === 'RUNNING' && (
            <FakeButton
              className="text-sw-gray-400"
              label={t('walletCompatibility.modal.button.closeTimer', {
                defaultValue: 'Popup will close in {{count}} sec...',
                count: showTimer.time,
              })}
            />
          )}
        </div>
      ) : (
        <div className={actionsClassName(isFullHeight)}>
          <Button
            size="lg"
            variant="primary"
            onClick={() => onMsg({ type: 'on_check_compatibility' })}>
            {t('walletCompatibility.modal.button.verify', 'Verify wallet')}
          </Button>
          <Button
            size="lg"
            variant="outlined"
            state={isSigning ? 'loading' : 'default'}
            onClick={() => onMsg({ type: 'on_sign_out' })}>
            {isSigning
              ? t(
                  'walletCompatibility.modal.button.signing',
                  'Sign with your wallet',
                )
              : t('walletCompatibility.modal.button.signOut', 'Sign out')}
          </Button>
        </div>
      )}
    </Card>
  );
};

interface ErrorProps extends LayoutProps {
  onMsg: (msg: MsgError) => void;
}

export const ErrorView = ({
  onMsg,
  hideCloseButton,
  isFullHeight,
  header,
}: ErrorProps) => {
  const { t } = useTypedTranslation();
  const handleClose = () => onMsg({ type: 'on_close' });

  useHandleKeyDown('Escape', handleClose, [], { enabled: !hideCloseButton });

  return (
    <Card className={cardClassName(isFullHeight)}>
      {!hideCloseButton && (
        <CloseButton
          onClick={handleClose}
          className="absolute top-sw-2xl right-sw-2xl"
        />
      )}
      {header}
      <GppBadFill size={48} className="text-sw-status-error" />

      <header className="flex flex-col gap-sw-lg">
        <h1 className="text-sw-label-lg text-sw-gray-50">
          {t(
            'walletCompatibility.modal.title.error',
            'Unable to verify wallet',
          )}
        </h1>
        <p className="text-sw-body-md text-sw-gray-200">
          {t(
            'walletCompatibility.modal.description.error',
            'We couldn’t complete the verification. It may have been interrupted or your wallet may not be compatible.',
          )}
        </p>
        <p className="text-sw-body-md text-sw-gray-200">
          {t(
            'walletCompatibility.modal.button.tryAgainDesc',
            'If the issue continues, please try another wallet.',
          )}
        </p>
      </header>

      <div className={actionsClassName(isFullHeight)}>
        <Button
          size="lg"
          variant="primary"
          onClick={() => onMsg({ type: 'on_try_again' })}>
          {t('walletCompatibility.modal.button.tryAgain', 'Try again')}
        </Button>
        <Button
          size="lg"
          variant="outlined"
          onClick={() => onMsg({ type: 'on_sign_out' })}>
          {t('walletCompatibility.modal.button.signOut', 'Sign out')}
        </Button>
      </div>
    </Card>
  );
};

export const WalletCompatibilityModal = Object.assign(Initial, {
  Error: ErrorView,
});
