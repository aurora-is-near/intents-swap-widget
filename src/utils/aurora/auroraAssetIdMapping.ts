export function evmAddressToIntentsAssetId(evmAddress: string): string {
  if (!evmAddress) {
    throw new Error('EVM address is required');
  }

  const cleanAddress = evmAddress.toLowerCase().replace(/^0x/, '');

  if (!/^[a-f0-9]{40}$/i.test(cleanAddress)) {
    throw new Error(`Invalid EVM address format: ${evmAddress}`);
  }

  return `nep141:${cleanAddress}.factory.bridge.near`;
}

export function intentsAssetIdToEvmAddress(assetId: string): string | null {
  if (!assetId) {
    return null;
  }

  const pattern = /^nep141:([a-f0-9]{40})\.factory\.bridge\.near$/i;
  const match = assetId.match(pattern);

  if (!match) {
    return null;
  }

  return `0x${match[1]}`;
}


