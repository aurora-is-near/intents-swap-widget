import { type ReactNode, useState } from 'react';
import type { DetectedFamily } from '@aurora-is-near/intents-connect-wallet/detect';

import { CheckIcon, ChevronIcon, Notice, Tag, truncateMiddle } from '../ui';
import { FAMILY_LABEL } from './families';
import type { WalletSession } from './useWalletSession';
import { WalletIcon } from './WalletIcon';

const UNSUPPORTED_COPY = {
  NOT_CONNECTED: 'The wallet stopped sharing its account. Connect it again.',
  MISSING_PUBLIC_KEY:
    "The NEAR wallet didn't share its public key. Connect it again.",
} as const;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const QrIcon = () => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    aria-hidden>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
  </svg>
);

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <section>
    <h3 className="mb-2 text-text-secondary">{label}</h3>
    <ul className="overflow-hidden rounded-xl bg-surface-raised shadow-box [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
      {children}
    </ul>
  </section>
);

const Row = ({
  icon,
  title,
  tags,
  detail,
  status,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  tags?: ReactNode;
  detail: string;
  status: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) => (
  <li>
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium">{title}</span>
          {tags}
        </span>
        <span className="block truncate text-text-muted">{detail}</span>
      </span>
      <span className="flex flex-none items-center gap-1 text-text-muted">
        {status}
      </span>
    </button>
  </li>
);

const Status = ({
  pending,
  active,
  connected,
}: {
  pending: boolean;
  active: boolean;
  connected: boolean;
}) => {
  if (pending) {
    return <span className="text-text-secondary">Check wallet…</span>;
  }

  if (active) {
    return (
      <span className="inline-flex items-center gap-1 text-text-primary">
        <CheckIcon /> In use
      </span>
    );
  }

  return connected ? (
    <ChevronIcon />
  ) : (
    <span className="rounded-lg bg-white px-2.5 py-1 font-medium text-text-primary shadow-box">
      Connect
    </span>
  );
};

/**
 * Browser wallets grouped by family, then the phone. A wallet that already
 * shares an account is picked as is; any other is asked to connect first.
 */
export const WalletsScreen = ({
  session,
  dappName,
  dappAccount,
  canPair,
  onPicked,
  onPair,
}: {
  session: WalletSession;
  dappName: string;
  /** The dApp's own account: its wallet gets an "On <dApp>" tag. */
  dappAccount: string | null;
  canPair: boolean;
  onPicked: () => void;
  onPair: () => void;
}) => {
  const { wallets, peer, active, unsupportedReason } = session;
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();
  const dapp = dappAccount?.toLowerCase();

  const pick = async (wallet: (typeof wallets)[number]) => {
    setPending(wallet.id);
    setError(undefined);

    try {
      await session.select(wallet);
      onPicked();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(undefined);
    }
  };

  return (
    <div className="-mx-1 flex max-h-[min(60vh,460px)] flex-col gap-4 overflow-y-auto px-1 pb-1">
      <p className="text-text-secondary">
        Pay from any wallet, on any chain. It&apos;s bridged and supplied for
        you.
      </p>

      {(Object.keys(FAMILY_LABEL) as DetectedFamily[]).map((family) => {
        const group = wallets.filter((wallet) => wallet.family === family);

        return group.length > 0 ? (
          <Group key={family} label={FAMILY_LABEL[family]}>
            {group.map((wallet) => (
              <Row
                key={wallet.id}
                icon={<WalletIcon name={wallet.name} icon={wallet.icon} />}
                title={wallet.name}
                tags={
                  family === 'evm' &&
                  dapp &&
                  wallet.address?.toLowerCase() === dapp ? (
                    <Tag>On {dappName}</Tag>
                  ) : null
                }
                detail={
                  wallet.address
                    ? truncateMiddle(wallet.address)
                    : 'Not connected'
                }
                status={
                  <Status
                    pending={pending === wallet.id}
                    active={
                      !active?.mobile &&
                      active?.key === `${wallet.id}:${wallet.address}`
                    }
                    connected={!!wallet.address}
                  />
                }
                disabled={pending !== undefined}
                onClick={() => {
                  void pick(wallet);
                }}
              />
            ))}
          </Group>
        ) : null;
      })}

      {wallets.length === 0 ? (
        <Notice tone="info">
          No browser wallet found. Install MetaMask, Phantom or HOT and reload
          {canPair ? ', or use your phone' : ''}.
        </Notice>
      ) : null}

      {canPair ? (
        <Group label="Phone">
          {peer ? (
            <Row
              icon={<WalletIcon name={peer.name} icon={peer.icon} />}
              title={peer.name}
              tags={<Tag>EVM</Tag>}
              detail={truncateMiddle(peer.address)}
              status={
                <Status pending={false} active={!!active?.mobile} connected />
              }
              disabled={pending !== undefined}
              onClick={() => {
                session.selectPhone(peer);
                onPicked();
              }}
            />
          ) : null}
          <Row
            icon={
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-surface-hover text-text-primary">
                <QrIcon />
              </span>
            }
            title={peer ? 'Pair another phone' : 'Phone wallet'}
            detail="EVM, by QR code (WalletConnect)"
            status={<ChevronIcon />}
            disabled={pending !== undefined}
            onClick={onPair}
          />
        </Group>
      ) : null}

      {(error ?? unsupportedReason) ? (
        <p className="text-danger">
          {error ?? (unsupportedReason && UNSUPPORTED_COPY[unsupportedReason])}
        </p>
      ) : null}
    </div>
  );
};
