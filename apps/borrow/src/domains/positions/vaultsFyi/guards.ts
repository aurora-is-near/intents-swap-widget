/**
 * The vaults.fyi borrow responses this reader uses, checked at the boundary.
 * Only the fields it reads are typed and checked; anything else in the answer
 * is ignored. A missing or mistyped field throws `VaultsFyiReadError`, so a
 * changed Beta response is a read error, never an empty list.
 *
 * Shapes: https://api.vaults.fyi/v2/documentation/json ("Borrow Markets"),
 * served under /beta/borrow (docs.vaults.fyi/api-reference/beta).
 */

/** A vaults.fyi answer that failed, or that this reader cannot read. */
export class VaultsFyiReadError extends Error {
  /** The HTTP status, when the call itself failed. */
  readonly status?: number;

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'VaultsFyiReadError';
    this.status = options?.status;
  }
}

export type VaultsFyiProtocol = {
  protocolId: string;
  name: string;
  displayName?: string;
  version?: string;
};

export type VaultsFyiNetwork = { name: string; chainId: number };

export type VaultsFyiAsset = {
  address: string;
  symbol: string;
  decimals: number;
};

export type VaultsFyiPositionAsset = {
  positionId: string;
  asset: VaultsFyiAsset;
  collateralEnabled: boolean;
  suppliedNative: bigint;
  borrowedNative: bigint;
  suppliedUsd: number | null;
  borrowedUsd: number | null;
};

export type VaultsFyiPosition = {
  marketId: string;
  name: string;
  network: VaultsFyiNetwork;
  protocol: VaultsFyiProtocol;
  userAddress: string;
  assets: VaultsFyiPositionAsset[];
  ltv: number | null;
  healthFactor: number | null;
};

export type VaultsFyiMarketAsset = {
  asset: VaultsFyiAsset;
  /** Fraction, as the market's default risk parameters give it. */
  liquidationThreshold: number | null;
  borrowRate: number | null;
};

export type VaultsFyiMarket = {
  marketId: string;
  network: VaultsFyiNetwork;
  assetsData: VaultsFyiMarketAsset[];
};

type Json = Record<string, unknown>;

const fail = (what: string) =>
  new VaultsFyiReadError(`vaults.fyi answered an unexpected ${what}`);

const objectAt = (value: unknown, what: string): Json => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw fail(what);
  }

  return value as Json;
};

const arrayAt = (value: unknown, what: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw fail(what);
  }

  return value;
};

const stringAt = (value: unknown, what: string): string => {
  if (typeof value !== 'string' || value === '') {
    throw fail(what);
  }

  return value;
};

const optionalStringAt = (value: unknown, what: string) =>
  value === undefined ? undefined : stringAt(value, what);

const finite = (value: unknown, what: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw fail(what);
  }

  return value;
};

/** An optional non-negative number; absent (or null) is `null`. */
const optionalNumberAt = (value: unknown, what: string): number | null =>
  value === undefined || value === null ? null : finite(value, what);

/** An integer amount sent as a string, such as `"1250000"`. */
const nativeAt = (value: unknown, what: string): bigint => {
  const text = stringAt(value, what);

  if (!/^\d+$/.test(text)) {
    throw fail(what);
  }

  return BigInt(text);
};

/** A dollar value sent as a string; absent is `null` (no price). */
const usdAt = (value: unknown, what: string): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return finite(Number(stringAt(value, what)), what);
};

const toNetwork = (value: unknown): VaultsFyiNetwork => {
  const network = objectAt(value, 'network');

  return {
    name: stringAt(network.name, 'network name'),
    chainId: finite(network.chainId, 'network chain id'),
  };
};

const toProtocol = (value: unknown): VaultsFyiProtocol => {
  const protocol = objectAt(value, 'protocol');

  return {
    protocolId: stringAt(protocol.protocolId, 'protocol id'),
    name: stringAt(protocol.name, 'protocol name'),
    displayName: optionalStringAt(protocol.displayName, 'protocol name'),
    version: optionalStringAt(protocol.version, 'protocol version'),
  };
};

const toAsset = (value: unknown): VaultsFyiAsset => {
  const asset = objectAt(value, 'asset');

  return {
    address: stringAt(asset.address, 'asset address').toLowerCase(),
    symbol: stringAt(asset.symbol, 'asset symbol'),
    decimals: finite(asset.decimals, 'asset decimals'),
  };
};

const toPositionAsset = (value: unknown): VaultsFyiPositionAsset => {
  const entry = objectAt(value, 'position asset');

  if (typeof entry.collateralEnabled !== 'boolean') {
    throw fail('position asset collateral flag');
  }

  return {
    positionId: stringAt(entry.positionId, 'position id'),
    asset: toAsset(entry.asset),
    collateralEnabled: entry.collateralEnabled,
    suppliedNative: nativeAt(entry.suppliedNative, 'supplied amount'),
    borrowedNative: nativeAt(entry.borrowedNative, 'borrowed amount'),
    suppliedUsd: usdAt(entry.suppliedUsd, 'supplied value'),
    borrowedUsd: usdAt(entry.borrowedUsd, 'borrowed value'),
  };
};

/** One market position (`/borrow/portfolio/positions/{user}/{network}/{marketId}`). */
export const toPosition = (value: unknown): VaultsFyiPosition => {
  const position = objectAt(value, 'position');

  return {
    marketId: stringAt(position.marketId, 'market id'),
    name: stringAt(position.name, 'market name'),
    network: toNetwork(position.network),
    protocol: toProtocol(position.protocol),
    userAddress: stringAt(position.userAddress, 'user address').toLowerCase(),
    assets: arrayAt(position.assets, 'position assets').map(toPositionAsset),
    ltv: optionalNumberAt(position.ltv, 'position LTV'),
    healthFactor: optionalNumberAt(position.healthFactor, 'health factor'),
  };
};

/** A wallet's positions (`/borrow/portfolio/positions/{user}`): `{ data }`. */
export const toPositionList = (value: unknown): VaultsFyiPosition[] =>
  arrayAt(objectAt(value, 'position list').data, 'position list').map(
    toPosition,
  );

const toMarketAsset = (value: unknown): VaultsFyiMarketAsset => {
  const entry = objectAt(value, 'market asset');
  const risk =
    entry.defaultRiskParameters === undefined
      ? undefined
      : objectAt(entry.defaultRiskParameters, 'risk parameters');

  return {
    asset: toAsset(entry.asset),
    liquidationThreshold: optionalNumberAt(
      risk?.liquidationThreshold,
      'liquidation threshold',
    ),
    borrowRate: optionalNumberAt(entry.borrowRate, 'borrow rate'),
  };
};

/** One market (`/borrow/markets/{network}/{marketId}`): `{ market }`. */
export const toMarket = (value: unknown): VaultsFyiMarket => {
  const market = objectAt(objectAt(value, 'market').market, 'market');

  return {
    marketId: stringAt(market.marketId, 'market id'),
    network: toNetwork(market.network),
    assetsData: arrayAt(market.assetsData, 'market assets').map(toMarketAsset),
  };
};
