# Aurora Integration Architecture

Complete technical reference for Aurora blockchain integration in the Intents Swap Widget.

---

## Overview

Aurora is integrated as the first **Virtual Chain (VC)** - an EVM-compatible Layer 2 on NEAR Protocol. The architecture is designed to be extensible for future virtual chains while maintaining Aurora-specific optimizations.

---

## Architecture

### Core System Structure

```
src/
├── types/virtualChain.ts              # Generic VC type definitions
├── constants/
│   ├── virtualChains.ts               # VC registry & configuration
│   └── aurora.ts                      # Aurora-specific constants
├── utils/
│   ├── virtualChain/                  # Generic VC utilities
│   │   ├── quoteBuilder.ts           # Transfer pattern builders
│   │   ├── addressConverter.ts       # EVM address utilities
│   │   └── index.ts                  # Public exports
│   └── aurora/                        # Aurora-specific utilities
│       ├── quoteHelpers.ts           # Aurora quote builders (delegates to VC)
│       ├── auroraExitPrecompile.ts   # exitToNear transaction builder
│       ├── auroraAssetIdMapping.ts   # EVM ↔ AssetId conversion
│       ├── loadAuroraTokens.ts       # Aurora Explorer API integration
│       ├── parseAuroraToken.ts       # Token data mapping
│       ├── errors.ts                 # Aurora error types
│       └── isAurora.ts               # Type guards
└── hooks/
    ├── useAurora.ts                   # Facade hook for Aurora features
    └── useAuroraExitToNear.ts         # exitToNear precompile hook
```

### Design Principles

1. **Generic Virtual Chain Layer**: Reusable logic for all EVM L2s on NEAR
2. **Aurora-Specific Layer**: Optimizations and conveniences for Aurora
3. **Delegation Pattern**: Aurora helpers delegate to generic VC utilities
4. **Type Safety**: Full TypeScript coverage with strict mode

---

## Transfer Patterns

### 1. Into Virtual Chain (External → Aurora)

**Flow**: BSC/Ethereum → Aurora
**Implementation**: `buildSwapWithVirtualChainParams`

```typescript
// Key parameters
{
  recipient: 'aurora',                    // VC chainId
  recipientType: DESTINATION_CHAIN,
  destinationAsset: nearAssetId,          // NEAR-bridged token
  depositType: ORIGIN_CHAIN,
  refundTo: intentsAccountId,             // NEAR account for refunds
  refundType: ORIGIN_CHAIN,
  virtualChainRecipient: evmAddress,      // Actual Aurora recipient
  virtualChainRefundRecipient: evmAddress // Refund on Aurora
}
```

**Requirements**:
- Token must have NEAR-bridged equivalent
- Refunds go to Intents account (API limitation)
- Actual delivery uses `virtualChainRecipient`

### 2. Into Virtual Chain (Intents → Aurora)

**Flow**: NEAR Intents → Aurora
**Implementation**: `buildIntoVirtualChainParams`

```typescript
// Key parameters
{
  recipient: 'aurora',
  recipientType: DESTINATION_CHAIN,
  destinationAsset: nearAssetId,
  depositType: INTENTS,                   // Withdrawing from Intents
  refundTo: intentsAccountId,
  refundType: INTENTS,
  virtualChainRecipient: evmAddress,
  virtualChainRefundRecipient: evmAddress
}
```

**Execution**: Uses 1Click API with `ft_transfer_call` on NEAR

### 3. Out of Virtual Chain (Aurora → External)

**Flow**: Aurora → BSC/Ethereum
**Implementation**: `buildSwapWithVirtualChainParams`

```typescript
// Key parameters
{
  originAsset: nearAssetId,               // NEAR-bridged token (not Aurora native!)
  recipient: destinationAddress,
  recipientType: DESTINATION_CHAIN,
  destinationAsset: externalAssetId,
  depositType: ORIGIN_CHAIN,              // Aurora is origin
  refundTo: intentsAccountId,
  refundType: INTENTS,                    // Refunds to Intents
  virtualChainRecipient: auroraAddress,
  virtualChainRefundRecipient: auroraAddress
}
```

**Critical**: `originAsset` must use NEAR-bridged AssetId for exitToNear compatibility

### 4. Out of Virtual Chain (Aurora → NEAR)

**Flow**: Aurora → NEAR
**Implementation**: Direct precompile call via `useAuroraExitToNear`

```typescript
// Direct transaction to exitToNear precompile
{
  to: '0xE9217BC70B7ED1f598ddD3199e80b093fA71124F',
  data: encodeExitToNear(receiver, amount, tokenAddress)
}
```

**Bypass**: Skips 1Click API entirely, uses Aurora native precompile

### 5. Aurora Deposit (Aurora → Intents)

**Flow**: Aurora → NEAR Intents
**Implementation**: `buildVirtualChainDepositParams`

```typescript
// Key parameters
{
  recipient: intentsAccountId,
  recipientType: INTENTS,
  depositType: ORIGIN_CHAIN,
  destinationAsset: nearAssetId,
  refundTo: intentsAccountId,
  refundType: ORIGIN_CHAIN,
  virtualChainRecipient: auroraAddress,
  virtualChainRefundRecipient: auroraAddress
}
```

**Use Case**: Moving Aurora tokens into Intents balance

---

## Token Mapping System

### EVM Address ↔ NEAR AssetId

Aurora tokens exist in two formats:

1. **Aurora Native**: `0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79` (AURORA token)
2. **NEAR-Bridged**: `nep141:aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near`

### Token Bridge Map

Configured in `src/constants/virtualChains.ts`:

```typescript
export const AURORA_CONFIG: VirtualChainConfig = {
  chainId: 'aurora',
  name: 'Aurora',
  isEvm: true,
  exitPrecompile: '0xE9217BC70B7ED1f598ddD3199e80b093fA71124F',
  tokenBridgeMap: {
    // AURORA token
    '0x8bec47865ade3b172a928df8f990bc7f2a3b9f79':
      'nep141:aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near',
    // Rainbow Bridged USDC
    '0xb12bfca5a55806aaf64e99521918a4bf0fc40802':
      'nep141:a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near',
    // Rainbow Bridged USDT
    '0x4988a896b1227218e4a686fde5eabdcabd91571f':
      'nep141:dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near',
    // Rainbow Bridged WBTC
    '0xf4eb217ba2454613b15dbdea6e5f22276410e89e':
      'nep141:2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near',
  },
};
```

### Bridge Token Format

Rainbow Bridge tokens: `<ethereum_erc20_address>.factory.bridge.near`

Example: Ethereum USDT `0xdac17f958d2ee523a2206206994597c13d831ec7` becomes:
```
nep141:dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near
```

---

## Address Conversion

### NEAR Account → EVM Address

```typescript
function nearAccountToEvmAddress(accountId: string): string {
  const hash = keccak256(Buffer.from(accountId));
  return `0x${hash.slice(-40)}`;
}
```

**Use Case**: Deriving EVM address from NEAR account for virtual chain parameters

**Limitation**: Derived addresses require "eth connector" setup on Aurora to receive funds

### EVM Address Utilities

```typescript
function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function normalizeEvmAddress(address: string): string {
  return address.toLowerCase().startsWith('0x')
    ? address.toLowerCase()
    : `0x${address.toLowerCase()}`;
}

function getEvmRecipient(recipient: string): string {
  return isEvmAddress(recipient)
    ? normalizeEvmAddress(recipient)
    : nearAccountToEvmAddress(recipient);
}
```

---

## Aurora exitToNear Precompile

### Overview

Aurora's native precompile for withdrawing assets to NEAR without 1Click API.

**Address**: `0xE9217BC70B7ED1f598ddD3199e80b093fA71124F`

### Transaction Encoding

```typescript
function buildExitToNearTransaction(
  params: ExitToNearParams,
  fromAddress: string
): TransactionRequest {
  const selector = id('exitToNear(string,uint256)').slice(0, 10);
  const encodedReceiver = defaultAbiCoder.encode(['string'], [params.receiver]);
  const encodedAmount = defaultAbiCoder.encode(['uint256'], [params.amount]);

  return {
    to: AURORA_EXIT_PRECOMPILE,
    from: fromAddress,
    data: selector + encodedReceiver.slice(2) + encodedAmount.slice(2),
    value: params.tokenAddress ? '0' : params.amount,
  };
}
```

### Usage

```typescript
const { executeExitToNear } = useAuroraExitToNear({ provider });

await executeExitToNear({
  receiver: 'recipient.near',
  amount: '1000000000000000000',
  tokenAddress: '0x...' // undefined for native ETH
});
```

---

## Aurora Explorer Integration

### Token Loading

```typescript
async function loadAuroraTokens(): Promise<Token[]> {
  const response = await fetch(
    'https://explorer.aurora.dev/api/v2/tokens?type=ERC-20'
  );

  return response.items
    .filter(token =>
      token.holders_count >= 10 &&
      parseFloat(token.circulating_market_cap || '0') >= 1000
    )
    .map(parseAuroraToken);
}
```

### Token Filtering

- Minimum 10 holders
- Minimum $1,000 market cap
- ERC-20 tokens only
- Stale time: 5 minutes

---

## Error Handling

### Aurora-Specific Errors

```typescript
// src/utils/aurora/errors.ts
export const AURORA_ERRORS = {
  AURORA_TOKEN_NOT_FOUND: 'Token not found on Aurora',
  AURORA_EXIT_FAILED: 'Aurora exit to NEAR failed',
  AURORA_INVALID_ASSET_ID: 'Invalid Aurora asset ID format',
  AURORA_NO_NEAR_EQUIVALENT: 'Token has no NEAR-bridged equivalent',
  AURORA_PROVIDER_NOT_AVAILABLE: 'Aurora provider not initialized',
  AURORA_UNSUPPORTED_TOKEN: 'Token not supported on Aurora',
};
```

### API Error Messages

Common 1Click API errors for Aurora:

| Error | Cause | Solution |
|-------|-------|----------|
| `Virtual chains refunds are only available for near blockchain` | Refund address is EVM, not NEAR | Set `refundTo: intentsAccountId` |
| `For refunds to virtual chains please select refundType = ORIGIN_CHAIN` | Wrong refundType for INTO VC | Use `refundType: ORIGIN_CHAIN` |
| `Target virtual chain does not have an eth connector set` | NEAR account lacks Aurora setup | Use actual EVM wallet address |
| `tokenOut is not valid` | Token has no NEAR equivalent | Ensure token in `tokenBridgeMap` |

---

## Configuration

### Network Configuration

```typescript
// src/constants/aurora.ts
export const AURORA_CHAIN_CONFIG = {
  chainId: '1313161554',
  name: 'Aurora Mainnet',
  rpcUrl: 'https://mainnet.aurora.dev',
  explorerUrl: 'https://aurorascan.dev',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
};

export const AURORA_BRIDGE_CONFIG = {
  bridgeContract: 'aurora.factory.bridge.near',
  assetIdPrefix: 'nep141:aurora.factory.bridge.near:',
  exitToNearPrecompile: '0xE9217BC70B7ED1f598ddD3199e80b093fA71124F',
};
```

### Gas Configuration

```typescript
export const AURORA_GAS = {
  EXIT_TO_NEAR: '300000000000000',  // 300 Tgas
  FT_TRANSFER_CALL: '300000000000000',
};
```

---

## Hooks

### useAurora (Facade Hook)

Combines all Aurora functionality:

```typescript
const {
  isAuroraChain,
  isAuroraToken,
  isAuroraAssetId,
  evmAddressToIntentsAssetId,
  intentsAssetIdToEvmAddress,
  buildAuroraDepositParams,
  buildAuroraIntoVCParams,
  buildAuroraOutOfVCParams,
  executeExitToNear,
} = useAurora({ providers });
```

### useAuroraExitToNear

Handles exitToNear precompile:

```typescript
const { executeExitToNear } = useAuroraExitToNear({
  provider: providers?.evm
});

const txHash = await executeExitToNear({
  receiver: 'recipient.near',
  amount: '1000000',
  tokenAddress: '0x...',
});
```

---

## Extending to New Virtual Chains

### Steps to Add New VC

1. **Define Config** in `src/constants/virtualChains.ts`:
```typescript
export const OPTIMISM_CONFIG: VirtualChainConfig = {
  chainId: 'optimism',
  name: 'Optimism',
  isEvm: true,
  exitPrecompile: '0x...',
  tokenBridgeMap: {
    // OP token mappings
  },
};
```

2. **Register VC**:
```typescript
export const VIRTUAL_CHAINS: Record<string, VirtualChainConfig> = {
  aurora: AURORA_CONFIG,
  optimism: OPTIMISM_CONFIG,  // Add here
};
```

3. **Add Chain Constants** (optional):
```typescript
// src/constants/optimism.ts
export const OPTIMISM_CHAIN_CONFIG = { ... };
```

4. **Create Helpers** (optional):
```typescript
// src/utils/optimism/quoteHelpers.ts
export function buildOptimismDepositParams(options) {
  return buildVirtualChainDepositParams({
    ...options,
    virtualChain: 'optimism',
  });
}
```

**That's it!** Generic VC utilities handle the rest.

---

## Testing Requirements

### MetaMask Setup

For Aurora testing, users need:

1. **Aurora Network Added**:
   - Network Name: Aurora Mainnet
   - RPC URL: `https://mainnet.aurora.dev`
   - Chain ID: `1313161554`
   - Currency: ETH
   - Explorer: `https://aurorascan.dev`

2. **Test Tokens**:
   - AURORA token: `0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79`
   - USDT: `0x4988a896b1227218e4A686fdE5EabdcAbd91571f`
   - USDC: `0xB12BFcA5A55806AaF64E99521918A4bf0fC40802`

3. **ETH for Gas**: Small amount (~$1) for transaction fees

### Test Scenarios

| Scenario | Wallet | Description |
|----------|--------|-------------|
| Deposit | MetaMask (Aurora) | Aurora tokens → Intents |
| Withdraw | MetaMask (Aurora) | Intents → Aurora tokens |
| Exit to NEAR | MetaMask (Aurora) | Aurora → NEAR (direct) |
| External → Aurora | MetaMask (BSC) + NEAR | ⚠️ Requires NEAR wallet for refunds |

**Note**: External → Aurora swaps require NEAR wallet connected due to 1Click API refund limitations.

---

## Performance Optimizations

### Provider Caching

```typescript
const providerCache = new Map<string, ethers.JsonRpcProvider>();

export function getOrCreateProvider(rpcUrl: string) {
  if (!providerCache.has(rpcUrl)) {
    providerCache.set(rpcUrl, new ethers.JsonRpcProvider(rpcUrl));
  }
  return providerCache.get(rpcUrl)!;
}
```

### React Query Configuration

```typescript
useQuery({
  queryKey: ['auroraTokens'],
  queryFn: loadAuroraTokens,
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 10 * 60 * 1000,     // 10 minutes
});
```

---

## Key Implementation Files

| File | Purpose | LOC |
|------|---------|-----|
| `src/utils/virtualChain/quoteBuilder.ts` | Core transfer pattern logic | 230 |
| `src/utils/virtualChain/addressConverter.ts` | EVM address utilities | 27 |
| `src/utils/aurora/quoteHelpers.ts` | Aurora convenience wrappers | 65 |
| `src/utils/aurora/auroraExitPrecompile.ts` | exitToNear transaction builder | 52 |
| `src/utils/aurora/loadAuroraTokens.ts` | Aurora Explorer integration | 57 |
| `src/hooks/useAurora.ts` | Facade hook | 132 |
| `src/hooks/useAuroraExitToNear.ts` | exitToNear hook | 73 |
| `src/constants/virtualChains.ts` | VC registry | 42 |

**Total**: ~680 lines of Aurora-specific code

---

## Resources

- **Aurora Docs**: https://doc.aurora.dev
- **Aurora Explorer**: https://aurorascan.dev
- **Rainbow Bridge**: https://rainbowbridge.app
- **1Click API Docs**: https://docs.intents.org
- **exitToNear Precompile**: https://doc.aurora.dev/dev-reference/bridge/exit-to-near/

---

**Version**: 1.0.0
**Last Updated**: 2025-10-06
**Maintainer**: Intents Widget Team
