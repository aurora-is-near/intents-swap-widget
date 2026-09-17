import { CHAINS } from '@/constants/chains';
import { isValidChainAddress } from './isValidChainAddress';

const EVM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('isValidChainAddress', () => {
  it.each(CHAINS)('has a validator for chain %s', (chain) => {
    expect(isValidChainAddress(chain, 'not-an-address')).not.toBeNull();
  });

  it('validates EVM addresses for every EVM chain, including adi', () => {
    expect(isValidChainAddress('adi', EVM)).toBe(true);
    expect(isValidChainAddress('eth', EVM)).toBe(true);
    expect(isValidChainAddress('hypercore', EVM)).toBe(true);
    expect(isValidChainAddress('eth', 'vitalik.eth')).toBe(false);
  });

  it('trims surrounding whitespace', () => {
    expect(isValidChainAddress('eth', ` ${EVM}\n`)).toBe(true);
    expect(
      isValidChainAddress('btc', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq '),
    ).toBe(true);
  });

  it.each([
    ['bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', true],
    ['BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ', true],
    ['bc1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ', false],
    ['bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr', true],
    ['1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', true],
    ['3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', true],
  ])('btc %s -> %s', (addr, expected) => {
    expect(isValidChainAddress('btc', addr)).toBe(expected);
  });

  it.each([
    ['ltc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el', true],
    ['LTC1Q8C6FSHW2DLWUN7EKN9QWF37CU2RN755UPCP6EL', true],
    ['LM2WMpR1Rp6j3Sa59cMXMs1SPzj9eXpGc1', true],
  ])('ltc %s -> %s', (addr, expected) => {
    expect(isValidChainAddress('ltc', addr)).toBe(expected);
  });

  it.each([
    ['t1Rv4exT7bqhZqi2j7xz8bUHDMxwosrjADU', true],
    ['t3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd', true],
    [
      'zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9sly',
      false,
    ],
  ])('zec %s -> %s', (addr, expected) => {
    expect(isValidChainAddress('zec', addr)).toBe(expected);
  });

  it.each([
    [
      'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x',
      true,
    ],
    ['ADDR1VX2FXV2UMYHTTKXYXP8X0DLPDT3K6CWNG5PXJ3JHSYDZERSPJRLSZ', true],
    ['Ae2tdPwUPEZFRbyhz3cpfC2CumGzNkFBN2L42rcUc2yjQpEkxDbkPodpMAi', true],
    [
      'DdzFFzCqrhsf6hiTYkK5gBAhVDwg3SiaHiEL9wZLYU3WqLUpx6DP5ZRJr4rtNRXbVNfk89FCHCDR365647os9AEJ8MKZNvG7UKTpythG',
      true,
    ],
    ['stake1u9ylzsgxaa6xctf4juup682ar3juj85n8tx3hthnljg47zctvm3rc', false],
  ])('cardano %s -> %s', (addr, expected) => {
    expect(isValidChainAddress('cardano', addr)).toBe(expected);
  });

  it.each([
    ['rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH', true],
    ['rrrrrrrrrrrrrrrrrrrrrhoLvTp', true],
    ['XVLhHMPHU98es4dbozjVtdWzVrDjtV5fdx1mHp98tDMoQXb', true],
  ])('xrp %s -> %s', (addr, expected) => {
    expect(isValidChainAddress('xrp', addr)).toBe(expected);
  });

  it.each([
    ['GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', true],
    [
      'MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVAAAAAAAAAAAAAJLK',
      true,
    ],
    ['ga5zsejyb37jrc5avcia5mop4rhtm335x2kgx3ihojapp5re34k4kzvn', false],
  ])('stellar %s -> %s', (addr, expected) => {
    expect(isValidChainAddress('stellar', addr)).toBe(expected);
  });

  it.each([
    ['EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', true],
    ['UQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqEBI', true],
    [
      '0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8',
      true,
    ],
    // testnet-only flag
    ['kQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqKYH', false],
    // bad checksum
    ['UQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', false],
  ])('ton %s -> %s', (addr, expected) => {
    expect(isValidChainAddress('ton', addr)).toBe(expected);
  });

  it.each([
    [
      '0x02a212de6a9dfa3a69e22387acfbafbb1a9e591bd9d636e7895dcfc8de05f331',
      true,
    ],
    [
      '0x2a212de6a9dfa3a69e22387acfbafbb1a9e591bd9d636e7895dcfc8de05f331',
      false,
    ],
    [EVM, false],
  ])('sui %s -> %s', (addr, expected) => {
    expect(isValidChainAddress('sui', addr)).toBe(expected);
  });
});
