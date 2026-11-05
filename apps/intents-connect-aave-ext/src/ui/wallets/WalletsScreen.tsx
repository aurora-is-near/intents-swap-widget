import { type ReactNode, useState } from 'react';
import type { WalletConnectClient } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';
import type {
  DetectedFamily,
  UnsupportedReason,
} from '@aurora-is-near/intents-connect-wallet/detect';
import type { TonConnectClient } from '@aurora-is-near/intents-connect-wallet/ton';

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
import { type Pairer, type PairingCopy, PairingScreen } from './PairingScreen';
import type { WalletSession } from './useWalletSession';
import { WalletIcon } from './WalletIcon';

const UNSUPPORTED_COPY: Record<UnsupportedReason, string> = {
  NOT_CONNECTED: 'The wallet stopped sharing its account. Connect it again.',
  MISSING_PUBLIC_KEY:
    "The wallet didn't share its public key. Connect it again.",
  NO_SIGN_DATA:
    "This TON wallet can't sign messages, which a supply needs. Try Tonkeeper or MyTonWallet.",
  WRONG_NETWORK: 'The TON wallet is on the testnet. Switch it to mainnet.',
};

const PHONE_COPY: Record<'evm' | 'ton', PairingCopy> = {
  evm: {
    hint: 'Scan with an EVM wallet on your phone (MetaMask, Rainbow, Trust, Coinbase Wallet…), then approve the connection there.',
    linkLabel: 'WalletConnect link',
  },
  ton: {
    hint: 'Scan with a TON wallet on your phone (Tonkeeper, MyTonWallet, Tonhub…), then approve the connection there.',
    linkLabel: 'TON Connect link',
  },
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type Tab = 'browser' | 'qr';

const TABS: readonly [
  { id: Tab; label: string; icon: ReactNode },
  { id: Tab; label: string; icon: ReactNode },
] = [
  { id: 'browser', label: 'Browser wallets', icon: <BrowserIcon /> },
  { id: 'qr', label: 'QR code', icon: <QrIcon /> },
];

/** Two choices over one sliding background. */
const Segmented = <T extends string>({
  items,
  value,
  onChange,
  size = 'md',
}: {
  items: readonly [
    { id: T; label: string; icon: ReactNode },
    { id: T; label: string; icon: ReactNode },
  ];
  value: T;
  onChange: (value: T) => void;
  /** `sm`: 28 px tall, 12 px text, for a switch under content. */
  size?: 'md' | 'sm';
}) => (
  <div
    role="tablist"
    className={cx(
      'relative grid grid-cols-2 bg-track',
      size === 'sm' ? 'rounded-chip p-0.5' : 'rounded-control p-1',
    )}>
    <span
      aria-hidden
      className={cx(
        'absolute left-0 bg-control shadow-box transition-transform duration-200 ease-out',
        size === 'sm'
          ? 'inset-y-0.5 ml-0.5 w-[calc(50%-2px)] rounded-[calc(var(--r-chip)-1px)]'
          : 'inset-y-1 ml-1 w-[calc(50%-4px)] rounded-chip',
        value === items[1].id && 'translate-x-full',
      )}
    />
    {items.map(({ id, label, icon }) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={value === id}
        onClick={() => onChange(id)}
        className={cx(
          'relative flex items-center justify-center font-medium transition-colors',
          size === 'sm'
            ? 'h-6 gap-1 rounded-[calc(var(--r-chip)-1px)] text-xs'
            : 'h-8 gap-1.5 rounded-chip',
          value === id
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
  <div className="flex h-9 w-full items-center gap-2 rounded-control bg-surface-raised px-2.5 shadow-box">
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
/** The one wallet group shown open at first; the others start collapsed. */
const OPEN_BY_DEFAULT: DetectedFamily = 'sol';

const Group = ({
  family,
  children,
}: {
  family: DetectedFamily;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(family === OPEN_BY_DEFAULT);

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
            <ul className="overflow-hidden rounded-card bg-surface-raised shadow-box [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
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
  // The whole row cancels, while it waits: a button can't hold another.
  if (pending) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-text-secondary">Check wallet…</span>
        <span className="rounded-control bg-control px-2.5 py-1 font-medium text-text-primary shadow-box">
          Cancel
        </span>
      </span>
    );
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
    <span className="rounded-control bg-control px-2.5 py-1 font-medium text-text-primary shadow-box">
      Connect
    </span>
  );
};

/**
 * A paired phone, or a new pairing. Pairing replaces the phone's session,
 * so it only starts on its own when there is none.
 */
type PhonePeer = { address: string; name: string; icon?: string };

/** One kind of phone wallet: its paired wallet, or a QR code to pair one. */
const Phone = <TPeer extends PhonePeer>({
  family,
  peer,
  pairer,
  active,
  below,
  onSelect,
}: {
  family: 'evm' | 'ton';
  /** The paired wallet, if any. */
  peer: TPeer | null;
  pairer: Pairer<TPeer>;
  /** It's the wallet paying now. */
  active: boolean;
  /** Under the QR code (or the paired wallet), e.g. the chain switch. */
  below?: ReactNode;
  onSelect: (peer: TPeer) => void;
}) => {
  const [pairing, setPairing] = useState(!peer);

  if (pairing || !peer) {
    return (
      <PairingScreen
        pairer={pairer}
        copy={PHONE_COPY[family]}
        below={below}
        onPaired={onSelect}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="overflow-hidden rounded-card bg-surface-raised shadow-box">
        <Row
          icon={<WalletIcon name={peer.name} icon={peer.icon} />}
          title={peer.name}
          tags={<Tag>{FAMILY_LABEL[family]}</Tag>}
          detail={truncateMiddle(peer.address)}
          status={<Status pending={false} active={active} connected />}
          disabled={false}
          onClick={() => onSelect(peer)}
        />
      </ul>
      {below ? <div className="mx-auto w-[280px]">{below}</div> : null}
      <Button variant="secondary" onClick={() => setPairing(true)}>
        <QrIcon /> Pair another phone
      </Button>
    </div>
  );
};

/** Phone wallets by QR code: EVM over WalletConnect, TON over TON Connect. */
const PhoneTab = ({
  session,
  walletConnect,
  tonConnect,
  onPicked,
}: {
  session: WalletSession;
  walletConnect?: WalletConnectClient;
  tonConnect?: TonConnectClient;
  onPicked: () => void;
}) => {
  const { peer, tonPeer, active } = session;
  const [chain, setChain] = useState<'evm' | 'ton'>(() =>
    !walletConnect || (active?.mobile && active.family === 'ton')
      ? 'ton'
      : 'evm',
  );

  // Under the QR code, as wide as it, only when both kinds are offered.
  const chainSwitch =
    walletConnect && tonConnect ? (
      <Segmented
        size="sm"
        items={[
          {
            id: 'evm',
            label: FAMILY_LABEL.evm,
            icon: <FamilyIcon family="evm" size={12} />,
          },
          {
            id: 'ton',
            label: FAMILY_LABEL.ton,
            icon: <FamilyIcon family="ton" size={12} />,
          },
        ]}
        value={chain}
        onChange={setChain}
      />
    ) : null;

  return (
    <div className="flex flex-col gap-3">
      {chain === 'ton' && tonConnect ? (
        <Phone
          key="ton"
          family="ton"
          peer={tonPeer}
          pairer={tonConnect}
          below={chainSwitch}
          active={!!active?.mobile && active.family === 'ton'}
          onSelect={(paired) => {
            session.selectTonPhone(paired);
            onPicked();
          }}
        />
      ) : null}
      {chain === 'evm' && walletConnect ? (
        <Phone
          key="evm"
          family="evm"
          peer={peer}
          pairer={walletConnect}
          below={chainSwitch}
          active={!!active?.mobile && active.family === 'evm'}
          onSelect={(paired) => {
            session.selectPhone(paired);
            onPicked();
          }}
        />
      ) : null}
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
  tonConnect,
  onPicked,
}: {
  session: WalletSession;
  dappName: string;
  /** The dApp's own account: its wallet gets an "On <dApp>" tag. */
  dappAccount: string | null;
  /** The dApp's name for its wallet, for when detection can't see it. */
  dappWalletName?: string;
  /** Offers EVM phones in the QR code tab when set. */
  walletConnect?: WalletConnectClient;
  /** Offers TON phones in the QR code tab when set. */
  tonConnect?: TonConnectClient;
  onPicked: () => void;
}) => {
  const { wallets, active, unsupportedReason } = session;
  const [tab, setTab] = useState<Tab>('browser');
  /** The connection waiting on its wallet, which another pick calls off. */
  const [pending, setPending] = useState<{
    id: string;
    controller: AbortController;
  }>();

  const [error, setError] = useState<string>();
  const dapp = dappAccount?.toLowerCase();
  // The dApp's wallet, when it is one detection sees: its own icon and name.
  const dappWallet = wallets.find(
    (wallet) =>
      wallet.family === 'evm' && wallet.address?.toLowerCase() === dapp,
  );

  // A wallet may never answer (its popup closed): picking another one, or
  // Cancel, calls the wait off instead of freezing the list.
  const pick = async (wallet: (typeof wallets)[number]) => {
    pending?.controller.abort();

    const controller = new AbortController();

    setPending({ id: wallet.id, controller });
    setError(undefined);

    try {
      await session.select(wallet, { signal: controller.signal });

      if (!controller.signal.aborted) {
        onPicked();
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(errorMessage(caught));
      }
    } finally {
      setPending((current) =>
        current?.controller === controller ? undefined : current,
      );
    }
  };

  const cancel = () => {
    pending?.controller.abort();
    setPending(undefined);
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
                    pending={pending?.id === wallet.id}
                    active={
                      !active?.mobile &&
                      active?.key === `${wallet.id}:${wallet.address}`
                    }
                    connected={!!wallet.address}
                  />
                }
                disabled={false}
                onClick={() => {
                  if (pending?.id === wallet.id) {
                    cancel();
                  } else {
                    void pick(wallet);
                  }
                }}
              />
            ))}
          </Group>
        ) : null;
      })}

      {wallets.length === 0 ? (
        <Notice tone="info">
          No browser wallet found. Install MetaMask, Phantom or HOT and reload
          {(walletConnect ?? tonConnect) ? ', or use the QR code' : ''}.
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

      {(walletConnect ?? tonConnect) ? (
        <Segmented items={TABS} value={tab} onChange={setTab} />
      ) : null}

      <div className="flex flex-col gap-4">
        {tab === 'qr' && (walletConnect ?? tonConnect) ? (
          <PhoneTab
            session={session}
            walletConnect={walletConnect}
            tonConnect={tonConnect}
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
