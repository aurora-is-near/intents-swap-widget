import { type ReactNode, useState } from 'react';
import type { WalletConnectClient } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';
import type { DetectedFamily } from '@aurora-is-near/intents-connect-wallet/detect';

import {
  BrowserIcon,
  Button,
  CheckIcon,
  ChevronIcon,
  cx,
  Notice,
  QrIcon,
  Tag,
  truncateMiddle,
} from '../ui';
import { FAMILY_LABEL } from './families';
import { FamilyIcon } from './FamilyIcon';
import { PairingScreen } from './PairingScreen';
import type { WalletSession } from './useWalletSession';
import { WalletIcon } from './WalletIcon';

const UNSUPPORTED_COPY = {
  NOT_CONNECTED: 'The wallet stopped sharing its account. Connect it again.',
  MISSING_PUBLIC_KEY:
    "The NEAR wallet didn't share its public key. Connect it again.",
} as const;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type Tab = 'browser' | 'qr';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'browser', label: 'Browser wallets', icon: <BrowserIcon /> },
  { id: 'qr', label: 'QR code', icon: <QrIcon /> },
];

/** Two tabs over one sliding background. */
const Tabs = ({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
}) => (
  <div
    role="tablist"
    className="relative grid grid-cols-2 rounded-lg bg-black/5 p-1">
    <span
      aria-hidden
      className={cx(
        'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md bg-white shadow-box transition-transform duration-200 ease-out',
        tab === 'qr' && 'translate-x-full',
      )}
    />
    {TABS.map(({ id, label, icon }) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={tab === id}
        onClick={() => onChange(id)}
        className={cx(
          'relative flex h-8 items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
          tab === id
            ? 'text-text-primary'
            : 'text-text-muted hover:text-text-secondary',
        )}>
        {icon}
        {label}
      </button>
    ))}
  </div>
);

/** The wallet the dApp is connected with: one slim line, to tell it apart. */
const DappLine = ({
  dappName,
  name,
  icon,
  address,
}: {
  dappName: string;
  name: string;
  icon?: string;
  address: string;
}) => (
  <div className="flex h-9 w-full items-center gap-2 rounded-lg bg-surface-raised px-2.5 shadow-box">
    <span className="flex-none whitespace-nowrap text-text-muted">
      On {dappName}
    </span>
    <WalletIcon name={name} icon={icon} size={18} />
    <span className="min-w-0 truncate font-medium">{name}</span>
    <span className="flex-none">
      <Tag>
        <span className="mr-1 inline-flex">
          <FamilyIcon family="evm" size={11} />
        </span>
        {FAMILY_LABEL.evm}
      </Tag>
    </span>
    <span className="ml-auto flex-none whitespace-nowrap text-text-muted">
      {truncateMiddle(address, 4, 4)}
    </span>
  </div>
);

/** A family's wallets, collapsible, open to start with. */
const Group = ({
  family,
  children,
}: {
  family: DetectedFamily;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(true);

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mb-2 flex w-full items-center gap-1.5 text-text-secondary hover:text-text-primary">
        <FamilyIcon family={family} />
        <span className="font-medium">{FAMILY_LABEL[family]}</span>
        <span
          className={cx(
            'ml-auto transition-transform duration-200',
            open ? 'rotate-90' : 'rotate-0',
          )}>
          <ChevronIcon />
        </span>
      </button>
      <div
        className={cx(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}>
        {/* Padding inside the clipped box, so a closed group takes no room;
            the room around the list keeps its shadow ring unclipped. */}
        <div className="-mx-1 min-h-0 overflow-hidden px-1">
          <div className="pt-px pb-1">
            <ul className="overflow-hidden rounded-xl bg-surface-raised shadow-box [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
              {children}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

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
        <CheckIcon /> Connected
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
 * A paired phone, or a new pairing. Pairing replaces the phone's session,
 * so it only starts on its own when there is none.
 */
const PhoneTab = ({
  session,
  walletConnect,
  onPicked,
}: {
  session: WalletSession;
  walletConnect: WalletConnectClient;
  onPicked: () => void;
}) => {
  const { peer, active } = session;
  const [pairing, setPairing] = useState(!peer);

  if (pairing || !peer) {
    return (
      <PairingScreen
        walletConnect={walletConnect}
        onPaired={(paired) => {
          session.selectPhone(paired);
          onPicked();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="overflow-hidden rounded-xl bg-surface-raised shadow-box">
        <Row
          icon={<WalletIcon name={peer.name} icon={peer.icon} />}
          title={peer.name}
          tags={<Tag>EVM</Tag>}
          detail={truncateMiddle(peer.address)}
          status={
            <Status pending={false} active={!!active?.mobile} connected />
          }
          disabled={false}
          onClick={() => {
            session.selectPhone(peer);
            onPicked();
          }}
        />
      </ul>
      <Button variant="secondary" onClick={() => setPairing(true)}>
        <QrIcon /> Pair another phone
      </Button>
    </div>
  );
};

/**
 * The wallet paying now, then browser wallets grouped by family, or a phone
 * by QR code. A browser wallet that already shares an account is picked as
 * is; any other is asked to connect first.
 */
export const WalletsScreen = ({
  session,
  dappName,
  dappAccount,
  dappWalletName,
  walletConnect,
  onPicked,
}: {
  session: WalletSession;
  dappName: string;
  /** The dApp's own account: its wallet gets an "On <dApp>" tag. */
  dappAccount: string | null;
  /** The dApp's name for its wallet, for when detection can't see it. */
  dappWalletName?: string;
  /** Offers the QR code tab when set. */
  walletConnect?: WalletConnectClient;
  onPicked: () => void;
}) => {
  const { wallets, active, unsupportedReason } = session;
  const [tab, setTab] = useState<Tab>('browser');
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();
  const dapp = dappAccount?.toLowerCase();
  // The dApp's wallet, when it is one detection sees: its own icon and name.
  const dappWallet = wallets.find(
    (wallet) =>
      wallet.family === 'evm' && wallet.address?.toLowerCase() === dapp,
  );

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

  const browser = (
    <>
      {(Object.keys(FAMILY_LABEL) as DetectedFamily[]).map((family) => {
        const group = wallets.filter((wallet) => wallet.family === family);

        return group.length > 0 ? (
          <Group key={family} family={family}>
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
          {walletConnect ? ', or use the QR code' : ''}.
        </Notice>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {dappAccount ? (
        <DappLine
          dappName={dappName}
          name={dappWallet?.name ?? dappWalletName ?? 'Wallet'}
          icon={dappWallet?.icon}
          address={dappAccount}
        />
      ) : null}

      {walletConnect ? <Tabs tab={tab} onChange={setTab} /> : null}

      <div className="-mx-1 flex max-h-[min(56vh,420px)] flex-col gap-4 overflow-y-auto px-1 pt-1 pb-1">
        {tab === 'qr' && walletConnect ? (
          <PhoneTab
            session={session}
            walletConnect={walletConnect}
            onPicked={onPicked}
          />
        ) : (
          browser
        )}

        {(error ?? unsupportedReason) ? (
          <p className="text-danger">
            {error ??
              (unsupportedReason && UNSUPPORTED_COPY[unsupportedReason])}
          </p>
        ) : null}
      </div>
    </div>
  );
};
