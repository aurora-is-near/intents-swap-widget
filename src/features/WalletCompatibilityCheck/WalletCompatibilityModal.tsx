import {
  Check,
  Minus,
  RotateCw,
  ShieldQuestionMark,
  ShieldX,
} from 'lucide-react';
import { Button } from '@/components/Button';

type ModalState = 'initial' | 'error';

interface WalletCompatibilityCheckProps {
  state: ModalState;
  isSigning: boolean;
  onClose: () => void;
  onCheckCompatibility: () => void;
  onTryAgain: () => void;
  onSignOut: () => void;
}

const FeatureItem = ({ text }: { text: string }) => (
  <div className="flex h-12 w-full items-center rounded-xl bg-[#151a26] px-3">
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#36424c]">
      <Check size={13} strokeWidth={4} color="#99E2FF" />
    </div>
    <p className="text-label-m ml-sw-md font-medium text-[#ebedf5]">{text}</p>
  </div>
);

const ErrorItem = ({ text }: { text: string }) => (
  <div className="flex min-h-[56px] w-full items-center rounded-xl bg-[#151a26] px-3 py-3">
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#444240]">
      <Minus size={13} className="text-[#ebedf5]" strokeWidth={4} />
    </div>
    <p className="text-label-m ml-sw-md leading-4 font-medium text-[#ebedf5]">
      {text}
    </p>
  </div>
);

export const WalletCompatibilityModal = ({
  state,
  isSigning,
  onClose,
  onCheckCompatibility,
  onTryAgain,
  onSignOut,
}: WalletCompatibilityCheckProps) => {
  const isErrorState = state === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - matches Privy */}
      <div className="absolute inset-0 bg-[#24262D]/70 backdrop-blur-[5px] transition-[backdrop-filter] duration-100" />

      {/* Modal */}
      <div className="relative z-50 mx-5 w-full max-w-[359px] rounded-3xl bg-[#010714] px-6 pt-3 pb-6 shadow-[0px_0px_40px_0px_rgba(0,0,0,0.5)]">
        {/* Close button (matches Privy styles) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#1A2230] opacity-60">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
            data-slot="icon"
            height="16px"
            width="16px">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mt-[58px] flex flex-col items-center">
          {/* Icon */}
          <div className="relative mb-5 flex h-10 w-10 items-center justify-center">
            {isErrorState ? (
              <ShieldX size={40} color="#FADFAD" />
            ) : (
              <ShieldQuestionMark size={40} color="#99E2FF" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-h5 mb-4 text-center font-medium text-[#ebedf5]">
            {isErrorState ? 'Unable to verify' : 'Signature check required'}
          </h2>

          {/* Description */}
          <p className="text-p-s mb-8 max-w-[311px] text-center leading-5 font-normal text-[#b2b5c1]">
            {isErrorState
              ? "The check couldn't be completed. Try again or choose another sign-in option to continue."
              : 'To keep your account secure, we need to verify that your device is compatible with Calyx.'}
          </p>
        </div>

        {/* Content list */}
        <div className="mb-8 flex flex-col gap-[10px]">
          {isErrorState ? (
            <>
              <ErrorItem text="The verification was interrupted or canceled" />
              <ErrorItem text="Some wallets (or devices) are incompatible with the platform" />
            </>
          ) : (
            <>
              <FeatureItem text="Secure transactions and transfers" />
              <FeatureItem text="Full access to all Calyx features" />
              <FeatureItem text="Protection for your funds" />
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {isErrorState ? (
            <Button
              variant="primary"
              size="md"
              onClick={onTryAgain}
              className="h-12 w-full rounded-[10px] bg-[#ebedf5] text-[#28242e] hover:bg-[#d4d6de]">
              <RotateCw size={16} strokeWidth={3} />
              Try again
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              state={isSigning ? 'loading' : 'default'}
              onClick={onCheckCompatibility}
              className="h-12 w-full rounded-[10px] bg-[#ebedf5] text-[#28242e] hover:bg-[#d4d6de]">
              Check compatibility
            </Button>
          )}

          <Button
            variant="outlined"
            size="md"
            onClick={onSignOut}
            className="h-10 w-full rounded-[10px] border border-[#4f525c] bg-transparent text-[#ebedf5] hover:bg-[#4f525c]/10">
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};
