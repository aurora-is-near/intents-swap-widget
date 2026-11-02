import type { ReactNode } from 'react';

import { Notes } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon, Spinner } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { StatusHero } from '../../components/StatusHero';

/** A grey card of label/value rows, as under quotes and on result screens. */
export const NotesCard = ({ children }: { children: ReactNode }) => (
  <div className="flex shrink-0 flex-col rounded-sw-lg bg-sw-gray-900 p-sw-xl">
    <Notes>{children}</Notes>
  </div>
);

type StepState = 'done' | 'active' | 'todo';

const StepIcon = ({ state }: { state: StepState }) => {
  switch (state) {
    case 'done':
      return (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sw-status-success text-sw-gray-950">
          <Icon name="check" size={12} />
        </span>
      );
    case 'active':
      return <Spinner size={18} />;
    default:
      return (
        <span className="m-[2px] block h-[14px] w-[14px] shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--color-sw-gray-600)]" />
      );
  }
};

/** Who signs: the passkey, or a wallet (by its name in the extension). */
type Signer = { name: string; isPasskey: boolean };

type PendingProps = {
  signer: Signer;
  screenTitle: string;
  title: string;
  /** False until the intent is signed, or the wallet transaction sent. */
  isSigned: boolean;
  /** Spends wallet tokens: a transaction to confirm, not an intent to sign. */
  isFromWallet: boolean;
  /** What happens after signing, then the end state. */
  steps: [string, string];
  /** The transfer in one line, e.g. with `InlineAmount` and `InlineChain`. */
  assets?: ReactNode;
  notes: ReactNode;
  onBack: () => void;
};

export const TransferPending = ({
  signer,
  screenTitle,
  title,
  isSigned,
  isFromWallet,
  steps,
  assets,
  notes,
  onBack,
}: PendingProps) => {
  const who = signer.isPasskey ? 'passkey' : signer.name;
  const [waiting, done] = isFromWallet
    ? [`Confirm for ${who}`, `Sent from ${who}`]
    : [`Approve with ${who}`, `Signed with ${who}`];

  const prompt = (() => {
    if (signer.isPasskey) {
      return 'Approve the request with your passkey to continue.';
    }

    return isFromWallet
      ? `Confirm the transaction for ${who} to continue.`
      : `Approve the request for ${who} to continue.`;
  })();

  const rows: Array<[string, StepState]> = [
    [isSigned ? done : waiting, isSigned ? 'done' : 'active'],
    [steps[0], isSigned ? 'active' : 'todo'],
    [steps[1], 'todo'],
  ];

  return (
    <Screen title={screenTitle} onBack={onBack}>
      <StatusHero
        tone="pending"
        title={title}
        description={
          <div className="flex flex-col items-center gap-sw-md">
            {assets ? (
              <div className="leading-[24px] text-sw-gray-200">{assets}</div>
            ) : null}
            <div className="text-sw-body-sm text-sw-gray-300">
              {isSigned
                ? 'Submitted. Closing the panel won’t stop it.'
                : prompt}
            </div>
          </div>
        }
      />
      <div className="flex shrink-0 flex-col rounded-sw-lg bg-sw-gray-900 p-sw-xl">
        <ol className="m-0 flex list-none flex-col gap-sw-md p-[0px]">
          {rows.map(([label, state]) => (
            <li key={label} className="flex items-center gap-sw-md">
              <StepIcon state={state} />
              <span
                className={cn(
                  'text-sw-label-sm',
                  state === 'todo' ? 'text-sw-gray-400' : 'text-sw-gray-50',
                )}>
                {label}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <NotesCard>{notes}</NotesCard>
    </Screen>
  );
};

type ResultProps = {
  screenTitle: string;
  tone: 'success' | 'error';
  title: string;
  description: ReactNode;
  /** Shown between the hero and the notes, e.g. `TransferLegs`. */
  details?: ReactNode;
  notes: ReactNode;
  footer: ReactNode;
  onBack: () => void;
};

export const TransferResultView = ({
  screenTitle,
  tone,
  title,
  description,
  details,
  notes,
  footer,
  onBack,
}: ResultProps) => (
  <Screen title={screenTitle} onBack={onBack} footer={footer}>
    <StatusHero tone={tone} title={title} description={description} />
    {details}
    <NotesCard>{notes}</NotesCard>
  </Screen>
);
