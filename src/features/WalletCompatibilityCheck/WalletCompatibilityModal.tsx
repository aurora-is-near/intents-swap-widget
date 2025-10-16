import {
  Check,
  Minus,
  RotateCw,
  ShieldQuestionMark,
  ShieldX,
  X,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useTypedTranslation } from '@/localisation';

type ModalState = 'initial' | 'error';

type Msg =
  | { type: 'on_close' }
  | { type: 'on_check_compatibility' }
  | { type: 'on_try_again' }
  | { type: 'on_sign_out' };

interface WalletCompatibilityCheckProps {
  state: ModalState;
  isSigning: boolean;
  onMsg: (msg: Msg) => void;
}

const FeatureItem = ({ text }: { text: string }) => (
  <div className="flex h-12 w-full items-center rounded-xl bg-sw-modal-item px-3">
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sw-complete-900">
      <Check size={13} strokeWidth={4} className="text-sw-complete-100" />
    </div>
    <p className="text-label-m ml-sw-md font-medium text-sw-gray-50">{text}</p>
  </div>
);

const ErrorItem = ({ text }: { text: string }) => (
  <div className="flex min-h-[56px] w-full items-center rounded-xl bg-sw-modal-item px-3 py-3">
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sw-warn-900">
      <Minus size={13} className="text-sw-warn-100" strokeWidth={4} />
    </div>
    <p className="text-label-m ml-sw-md leading-4 font-medium text-sw-gray-50">
      {text}
    </p>
  </div>
);

export const WalletCompatibilityModal = ({
  state,
  isSigning,
  onMsg,
}: WalletCompatibilityCheckProps) => {
  const { t } = useTypedTranslation();
  const isErrorState = state === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - matches Privy */}
      <div className="absolute inset-0 bg-sw-gray-975/70 backdrop-blur-[5px] transition-[backdrop-filter] duration-100" />

      {/* Modal */}
      <div className="relative z-50 mx-5 w-full max-w-[359px] rounded-3xl bg-sw-modal-bg px-6 pt-3 pb-6 shadow-[0px_0px_40px_0px_rgba(0,0,0,0.5)]">
        {/* Close button (matches Privy styles) */}
        <button
          type="button"
          onClick={() => onMsg({ type: 'on_close' })}
          className="absolute top-4 right-4 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-sw-gray-975 opacity-60">
          <X size={16} strokeWidth={2} />
        </button>

        {/* Header */}
        <div className="mt-[58px] flex flex-col items-center">
          {/* Icon */}
          <div className="relative mb-5 flex h-10 w-10 items-center justify-center">
            {isErrorState ? (
              <ShieldX size={40} className="text-sw-warn-100" />
            ) : (
              <ShieldQuestionMark size={40} className="text-sw-complete-100" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-h5 mb-4 text-center font-medium text-sw-gray-50">
            {t(
              isErrorState
                ? 'walletCompatibility.modal.title.error'
                : 'walletCompatibility.modal.title.initial',
              isErrorState ? 'Unable to verify' : 'Signature check required',
            )}
          </h2>

          {/* Description */}
          <p className="text-p-s mb-8 max-w-[311px] text-center leading-5 font-normal text-sw-gray-100">
            {t(
              isErrorState
                ? 'walletCompatibility.modal.description.error'
                : 'walletCompatibility.modal.description.initial',
              isErrorState
                ? "The check couldn't be completed. Try again or choose another sign-in option to continue."
                : 'To keep your account secure, we need to verify that your device is compatible with Calyx.',
            )}
          </p>
        </div>

        {/* Content list */}
        <div className="mb-8 flex flex-col gap-[10px]">
          {isErrorState ? (
            <>
              <ErrorItem
                text={t(
                  'walletCompatibility.modal.error.interrupted',
                  'The verification was interrupted or canceled',
                )}
              />
              <ErrorItem
                text={t(
                  'walletCompatibility.modal.error.incompatible',
                  'Some wallets (or devices) are incompatible with the platform',
                )}
              />
            </>
          ) : (
            <>
              <FeatureItem
                text={t(
                  'walletCompatibility.modal.feature.secureTransactions',
                  'Secure transactions and transfers',
                )}
              />
              <FeatureItem
                text={t(
                  'walletCompatibility.modal.feature.fullAccess',
                  'Full access to all Calyx features',
                )}
              />
              <FeatureItem
                text={t(
                  'walletCompatibility.modal.feature.fundProtection',
                  'Protection for your funds',
                )}
              />
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {isErrorState ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => onMsg({ type: 'on_try_again' })}
              className="h-12 w-full rounded-[10px] bg-sw-gray-50 text-sw-mauve-975 hover:bg-sw-gray-100 hover:text-sw-mauve-975">
              <RotateCw size={16} strokeWidth={3} />
              {t('walletCompatibility.modal.button.tryAgain', 'Try again')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              state={isSigning ? 'loading' : 'default'}
              onClick={() => onMsg({ type: 'on_check_compatibility' })}
              className="h-12 w-full rounded-[10px] bg-sw-gray-50 text-sw-mauve-975 hover:bg-sw-gray-100 hover:text-sw-mauve-975">
              {t(
                'walletCompatibility.modal.button.checkCompatibility',
                'Check compatibility',
              )}
            </Button>
          )}

          <Button
            variant="outlined"
            size="md"
            onClick={() => onMsg({ type: 'on_sign_out' })}
            className="h-10 w-full rounded-[10px] border border-sw-gray-500 bg-transparent text-sw-gray-50 hover:bg-sw-gray-900 hover:text-sw-gray-50">
            {t('walletCompatibility.modal.button.signOut', 'Sign out')}
          </Button>
        </div>
      </div>
    </div>
  );
};
