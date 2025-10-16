# Virtual Chain Integration

This directory contains generic utilities for integrating virtual chains (Layer 2 solutions running on NEAR Protocol) into the intents swap widget.

## Architecture

### What are Virtual Chains?

Virtual chains are EVM-compatible or other execution environments that run on top of NEAR Protocol. The first supported virtual chain is **Aurora**, an EVM that allows Ethereum-compatible smart contracts to run on NEAR.

### Key Concepts

1. **Virtual Chain Recipient**: The account/address receiving tokens on the virtual chain
2. **Token Bridge Mapping**: Aurora tokens exist in two formats:
   - Native EVM address (e.g., `0x8BEc...`)
   - NEAR-bridged equivalent (e.g., `nep141:aaaaaa20...factory.bridge.near`)
3. **1Click API Requirement**: Destination assets MUST use NEAR-bridged AssetIds, not native virtual chain addresses

## Transfer Patterns

### 1. External Chain → Virtual Chain
**Example**: BSC USDT → Aurora AURORA

```typescript
// Uses buildSwapWithVirtualChainParams
{
  recipient: 'aurora',
  recipientType: 'DESTINATION_CHAIN',
  destinationAsset: 'nep141:aaaaaa20...factory.bridge.near', // NEAR-bridged token
  depositType: 'ORIGIN_CHAIN',
  refundTo: '0xYourBSCWallet',
  refundType: 'ORIGIN_CHAIN'
  // NO virtualChainRecipient params (causes API error)
}
```

### 2. NEAR Intents → Virtual Chain
**Example**: NEAR wNEAR (Intents) → Aurora ETH

```typescript
// Uses buildIntoVirtualChainParams
{
  recipient: 'aurora',
  recipientType: 'DESTINATION_CHAIN',
  destinationAsset: 'nep141:...factory.bridge.near', // NEAR-bridged token
  depositType: 'INTENTS',
  refundTo: 'your-account.near',
  refundType: 'INTENTS',
  virtualChainRecipient: '0xYourEVMAddress',
  virtualChainRefundRecipient: '0xYourEVMAddress'
}
```

### 3. Virtual Chain → External Chain
**Example**: Aurora USDC → BSC USDT

```typescript
// Uses buildVirtualChainWithdrawalParams
{
  originAsset: 'nep141:...factory.bridge.near', // NEAR asset
  recipient: '0xYourBSCWallet',
  recipientType: 'DESTINATION_CHAIN',
  destinationAsset: 'nep245:...', // Target chain token
  depositType: 'ORIGIN_CHAIN',
  refundTo: '0xYourAuroraWallet',
  refundType: 'ORIGIN_CHAIN'
}
```

### 4. Virtual Chain → NEAR Intents
**Example**: Aurora USDC → NEAR Intents

```typescript
// Uses buildVirtualChainDepositParams
{
  recipient: 'your-account.near',
  recipientType: 'INTENTS',
  depositType: 'ORIGIN_CHAIN',
  destinationAsset: 'nep141:...', // NEAR token
  refundTo: '0xYourAuroraWallet',
  refundType: 'ORIGIN_CHAIN',
  virtualChainRecipient: '0xYourEVMAddress',
  virtualChainRefundRecipient: '0xYourEVMAddress'
}
```

## Adding a New Virtual Chain

To add support for a new virtual chain:

### 1. Add Configuration

Edit `src/constants/virtualChains.ts`:

```typescript
export const YOUR_CHAIN_CONFIG: VirtualChainConfig = {
  chainId: 'your-chain',
  name: 'Your Chain',
  isEvm: true, // or false for non-EVM
  exitPrecompile: '0x...', // optional
  tokenBridgeMap: {
    // Add token mappings
    '0xlowercaseaddress': 'nep141:near-bridged-token',
  },
};

export const VIRTUAL_CHAINS: Record<string, VirtualChainConfig> = {
  aurora: AURORA_CONFIG,
  'your-chain': YOUR_CHAIN_CONFIG, // Add here
};
```

### 2. Add Chain Type

Edit `src/types/chain.ts` to include your chain in the `Chains` union type.

### 3. Add RPC Configuration

Edit `src/constants/chains.ts` to add RPC endpoint for balance checking.

### 4. Test Transfer Patterns

Test all four transfer patterns:
- External → Your Chain
- NEAR Intents → Your Chain
- Your Chain → External
- Your Chain → NEAR Intents

## Important API Constraints

### ⚠️ Virtual Chain Refunds

The error `"Virtual chains refunds are only available for near blockchain"` means:

- `virtualChainRecipient` params can ONLY be used when:
  - Origin is NEAR blockchain (INTENTS deposits)
  - OR for withdrawals from virtual chain (Aurora → other chains)

- For external chains → virtual chain:
  - Do NOT use `virtualChainRecipient` params
  - Use standard `refundTo`/`refundType` with origin chain wallet

### ⚠️ Token AssetIds

- Destination assets for virtual chains MUST use NEAR-bridged AssetIds
- Native virtual chain addresses will fail with `"tokenOut is not valid"`
- Maintain `tokenBridgeMap` in virtual chain config

## Files

- `quoteBuilder.ts`: Quote parameter builders for all virtual chain transfer patterns
- `addressConverter.ts`: EVM address utilities (NEAR account → EVM address conversion)
- `README.md`: This file

## Related Files

- `src/constants/virtualChains.ts`: Virtual chain configurations
- `src/types/virtualChain.ts`: TypeScript types
- `src/utils/aurora/*`: Aurora-specific utilities (deprecated, use generic virtual chain utils)

## Testing

When testing virtual chain integration:

1. ✅ Verify quote request succeeds
2. ✅ Check deposit address is returned
3. ✅ Test small amount first
4. ✅ Verify tokens arrive at destination
5. ✅ Test refund scenario (deposit below minimum)

## Common Issues

**Issue**: `"tokenOut is not valid"`
**Solution**: Use NEAR-bridged AssetId from `tokenBridgeMap`, not native virtual chain address

**Issue**: `"Virtual chains refunds are only available for near blockchain"`
**Solution**: Remove `virtualChainRecipient` params for external chain deposits

**Issue**: Tokens not appearing on virtual chain
**Solution**: Verify recipient address format matches chain requirements (EVM = 0x prefix)
