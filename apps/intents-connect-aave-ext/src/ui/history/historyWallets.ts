import type { WalletSession } from '../wallets/useWalletSession';
import { type HistoryWallet, uniqueWallets } from './entries';

/** A wallet whose runs are listed, and how to pay from it. */
export type FollowableWallet = HistoryWallet & {
  /** Makes it the active wallet; it already shares its account. */
  select: () => Promise<void> | void;
};

/**
 * Every wallet the page shows an account for: detected wallets sharing one,
 * the paired EVM phone and the paired TON phone, one per address.
 */
export const historyWallets = (session: WalletSession): FollowableWallet[] => {
  const activeAddress = session.active?.address;
  const { peer, tonPeer } = session;

  const detected = session.wallets.flatMap((wallet): FollowableWallet[] =>
    wallet.address
      ? [
          {
            address: wallet.address,
            name: wallet.name,
            icon: wallet.icon,
            active: wallet.address === activeAddress,
            select: () => session.select(wallet),
          },
        ]
      : [],
  );

  const phones: FollowableWallet[] = [
    ...(peer
      ? [
          {
            address: peer.address,
            name: peer.name,
            icon: peer.icon,
            active: peer.address === activeAddress,
            select: () => session.selectPhone(peer),
          },
        ]
      : []),
    ...(tonPeer
      ? [
          {
            address: tonPeer.address,
            name: tonPeer.name,
            icon: tonPeer.icon,
            active: tonPeer.address === activeAddress,
            select: () => session.selectTonPhone(tonPeer),
          },
        ]
      : []),
  ];

  return uniqueWallets([...detected, ...phones]);
};
