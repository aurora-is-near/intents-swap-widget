import { isEvmAddress } from './isEvmAddress';

export const isStarknetAddress = (addr: string) =>
  /^0x[0-9a-fA-F]{1,63}$/.test(addr) && !isEvmAddress(addr);
