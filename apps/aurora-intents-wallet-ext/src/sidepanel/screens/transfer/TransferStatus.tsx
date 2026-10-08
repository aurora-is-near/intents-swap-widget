import type { ReactNode } from 'react';

import { Notes } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import type { Account } from '../../accounts/types';
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

/** Who signs the intent: the passkey, or the connected wallet. */
const signer = (account: Account) =>
  account.kind === 'passkey' ? 'passkey' : account.walletName;

type PendingProps = {
  account: Account;
  screenTitle: string;
  title: string;
  /** False until the intent is signed, or the wallet transaction sent. */
  isSigned: boolean;
  /** Spends wallet tokens: a transaction to confirm, not an intent to sign. */
  isFromWallet: boolean;
  /** What happens after signing, then the end state. */
  steps: [string, string];
  notes: ReactNode;
  onBack: () => void;
};

export const TransferPending = ({
  account,
  screenTitle,
  title,
  isSigned,
  isFromWallet,
  steps,
  notes,
  onBack,
}: PendingProps) => {
  const who = signer(account);
  const [waiting, done] = isFromWallet
    ? [`Confirm in ${who}`, `Sent from ${who}`]
    : [`Approve with ${who}`, `Signed with ${who}`];

  const prompt = isFromWallet
    ? `Confirm the transaction in ${who} to continue.`
    : `Approve the request with your ${who} to continue.`;

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
          isSigned ? 'Submitted. Closing the panel won’t stop it.' : prompt
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
  notes: ReactNode;
  footer: ReactNode;
  onBack: () => void;
};

export const TransferResultView = ({
  screenTitle,
  tone,
  title,
  description,
  notes,
  footer,
  onBack,
}: ResultProps) => (
  <Screen title={screenTitle} onBack={onBack} footer={footer}>
    <StatusHero tone={tone} title={title} description={description} />
    <NotesCard>{notes}</NotesCard>
  </Screen>
);
