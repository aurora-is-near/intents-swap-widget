import { type ReactNode, useState } from 'react';
import type { WalletConnectClient } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';
import type {
  DetectedFamily,
  UnsupportedReason,
} from '@aurora-is-near/intents-connect-wallet/detect';
import type { TonConnectClient } from '@aurora-is-near/intents-connect-wallet/ton';

import { useAnnounce, useDisclosure, useTabs } from '../a11y';
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
import { TransferIcon, TransferTab } from '../transfer/TransferTab';
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
    qrLabel: 'QR code to connect an EVM wallet on your phone',
  },
  ton: {
    hint: 'Scan with a TON wallet on your phone (Tonkeeper, MyTonWallet, Tonhub…), then approve the connection there.',
    linkLabel: 'TON Connect link',
    qrLabel: 'QR code to connect a TON wallet on your phone',
  },
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export type WalletsTab = 'browser' | 'phone' | 'transfer';

const TAB_ITEMS: Record<
  WalletsTab,
  { id: WalletsTab; label: string; icon: ReactNode }
> = {
  browser: { id: 'browser', label: 'Browser', icon: <BrowserIcon /> },
  phone: { id: 'phone', label: 'Phone', icon: <QrIcon /> },
  transfer: { id: 'transfer', label: 'Transfer', icon: <TransferIcon /> },
};

type Tabs<T extends string> = ReturnType<typeof useTabs<T>>;

/**
 * A few choices over one sliding background: tabs (arrow keys, one Tab
 * stop) from the parent's `useTabs`, whose panel the parent renders.
 */
const Segmented = <T extends string>({
  items,
  value,
  name,
  tabs,
  size = 'md',
}: {
  items: readonly { id: T; label: string; icon: ReactNode }[];
  value: T;
  /** What the tabs choose between, for screen readers. */
  name: string;
  tabs: Tabs<T>;
  /** `sm`: 28 px tall, 12 px text, for a switch under content. */
  size?: 'md' | 'sm';
}) => {
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === value),
  );

  // The background's inset on each side: the list's own padding.
  const inset = size === 'sm' ? 'calc(var(--spacing) * 0.5)' : 'var(--spacing)';

  return (
    <div
      {...tabs.listProps(name)}
      className={cx(
        'relative grid bg-track',
        size === 'sm' ? 'rounded-chip p-0.5' : 'rounded-control p-1',
      )}
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
      }}>
      <span
        aria-hidden
        className={cx(
          'absolute left-0 bg-control shadow-box transition-transform duration-200 ease-out',
          size === 'sm'
            ? 'inset-y-0.5 ml-0.5 rounded-[calc(var(--r-chip)-1px)]'
            : 'inset-y-1 ml-1 rounded-chip',
        )}
        style={{
          width: `calc((100% - 2 * ${inset}) / ${items.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {items.map(({ id, label, icon }) => (
        <button
          key={id}
          {...tabs.tabProps(id)}
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
};

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
  const group = useDisclosure(open);

  return (
    <section>
      <h3 className="mb-2">
        <button
          type="button"
          {...group.triggerProps}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-1.5 text-text-secondary hover:text-text-primary">
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
      </h3>
      <div
        {...group.panelProps}
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
  current = false,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  tags?: ReactNode;
  detail: string;
  status: ReactNode;
  disabled: boolean;
  /** The wallet paying now. */
  current?: boolean;
  onClick: () => void;
}) => (
  <li>
    <button
      type="button"
      disabled={disabled}
      aria-current={current ? 'true' : undefined}
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
          current={active}
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

  const both = !!walletConnect && !!tonConnect;
  // The switch remounts with the code it switches: useTabs keeps focus on it.
  const chainTabs = useTabs({
    items: ['evm', 'ton'] as const,
    value: chain,
    onChange: setChain,
  });

  // Under the QR code, as wide as it, only when both kinds are offered.
  const chainSwitch = both ? (
    <Segmented
      size="sm"
      name="Phone wallet's network"
      tabs={chainTabs}
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
    />
  ) : null;

  return (
    <div
      className="flex flex-col gap-3"
      {...(both ? chainTabs.panelProps(chain) : {})}>
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
  transfer,
  initialTab = 'browser',
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
  /**
   * Offers paying by a transfer to a deposit address, from an exchange or
   * any wallet: the networks it covers, and what starts it.
   */
  /** `networks`: chain ids, most used first. */
  transfer?: { networks: readonly string[]; onStart: () => void };
  /** The tab shown first, e.g. Transfer when coming back from it. */
  initialTab?: WalletsTab;
  onPicked: () => void;
}) => {
  const { wallets, active, unsupportedReason } = session;
  const phones = !!(walletConnect ?? tonConnect);
  const tabs = [
    TAB_ITEMS.browser,
    ...(phones ? [TAB_ITEMS.phone] : []),
    ...(transfer ? [TAB_ITEMS.transfer] : []),
  ];

  const [tab, setTab] = useState<WalletsTab>(
    tabs.some((item) => item.id === initialTab) ? initialTab : 'browser',
  );

  const tabsA11y = useTabs({
    items: tabs.map((item) => item.id),
    value: tab,
    onChange: setTab,
  });

  const announce = useAnnounce();

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

    if (!wallet.address) {
      announce(
        `Waiting for ${wallet.name}: approve in its window, or choose it again to cancel.`,
      );
    }

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
                current={
                  !active?.mobile &&
                  active?.key === `${wallet.id}:${wallet.address}`
                }
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
          {phones ? ', or pair your phone' : ''}.
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

      {tabs.length > 1 ? (
        <Segmented items={tabs} value={tab} name="Pay from" tabs={tabsA11y} />
      ) : null}

      <div
        className="flex flex-col gap-4"
        {...(tabs.length > 1 ? tabsA11y.panelProps(tab) : {})}>
        {tab === 'phone' && phones ? (
          <PhoneTab
            session={session}
            walletConnect={walletConnect}
            tonConnect={tonConnect}
            onPicked={onPicked}
          />
        ) : null}
        {tab === 'transfer' && transfer ? (
          <TransferTab
            networks={transfer.networks}
            dappName={dappName}
            dappWallet={
              dappWallet?.address
                ? { name: dappWallet.name, address: dappWallet.address }
                : undefined
            }
            onStart={transfer.onStart}
          />
        ) : null}
        {tab === 'browser' ? browser : null}

        {(error ?? unsupportedReason) ? (
          <p className="text-danger" role="alert">
            {error ??
              (unsupportedReason && UNSUPPORTED_COPY[unsupportedReason])}
          </p>
        ) : null}
      </div>
    </div>
  );
};
