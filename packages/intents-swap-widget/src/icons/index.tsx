/* eslint-disable import/extensions */
import ArbIcon from './arb.svg?react';
import AsterIcon from './aster.svg?react';
import AuroraIcon from './aurora.svg?react';
import AvaxIcon from './avax.svg?react';
import BaseIcon from './base.svg?react';
import BeraIcon from './bera.svg?react';
import BscIcon from './bsc.svg?react';
import BtcIcon from './btc.svg?react';
import CardanoIcon from './cardano.svg?react';
import DogeIcon from './doge.svg?react';
import EthIcon from './eth.svg?react';
import FraxIcon from './frax.svg?react';
import GnearIcon from './gnear.svg?react';
import GnosisIcon from './gnosis.svg?react';
import ItlxIcon from './itlx.svg?react';
import KncIcon from './knc.svg?react';
import LoudIcon from './loud.svg?react';
import LtcIcon from './ltc.svg?react';
import MonIcon from './mon.svg?react';
import MpdaoIcon from './mpdao.svg?react';
import NearIcon from './near.svg?react';
import OpIcon from './op.svg?react';
import PolIcon from './pol.svg?react';
import PublicIcon from './public.svg?react';
import SolIcon from './sol.svg?react';
import SuiIcon from './sui.svg?react';
import TonIcon from './ton.svg?react';
import TronIcon from './tron.svg?react';
import UnknownIcon from './unknown.svg?react';
import XdaiIcon from './xdai.svg?react';
import XrpIcon from './xrp.svg?react';
import ZecIcon from './zec.svg?react';

import AbgIcon from './abg.png.base64?raw';
import JamboIcon from './jambo.png.base64?raw';
import NoearIcon from './noear.png.base64?raw';
import PurgeIcon from './purge.png.base64?raw';
import RheaIcon from './rhea.png.base64?raw';
import Usd1Icon from './usd1.png.base64?raw';
import UsdfIcon from './usdf.png.base64?raw';
import WifIcon from './wif.png.base64?raw';

import type { Chains } from '@/types/chain';

export const UNKNOWN_ICON: React.ReactElement = <UnknownIcon />;

export const CHAIN_ICONS: Record<Chains, React.ReactElement> = {
  arb: <ArbIcon />,
  avax: <AvaxIcon />,
  //   avax: (
  //     <AvaxIcon
  //       style={{ width: '100%', height: '100%' }}
  //       preserveAspectRatio="xMidYMid meet"
  //     />
  //   ),
  base: <BaseIcon />,
  bera: <BeraIcon />,
  bsc: <BscIcon />,
  btc: <BtcIcon />,
  eth: <EthIcon />,
  gnosis: <GnosisIcon />,
  op: <OpIcon />,
  pol: <PolIcon />,
  sol: <SolIcon />,
  sui: <SuiIcon />,
  ton: <TonIcon />,
  tron: <TronIcon />,
  xrp: <XrpIcon />,
  zec: <ZecIcon />,
  doge: <DogeIcon />,
  near: <NearIcon />,
  ltc: <LtcIcon />,
  cardano: <CardanoIcon />,
};

export const ASSET_ICONS: Record<string, React.ReactElement> = {
  arb: <ArbIcon />,
  aster: <AsterIcon />,
  aurora: <AuroraIcon />,
  avax: <AvaxIcon />,
  base: <BaseIcon />,
  bera: <BeraIcon />,
  bsc: <BscIcon />,
  btc: <BtcIcon />,
  cardano: <CardanoIcon />,
  doge: <DogeIcon />,
  eth: <EthIcon />,
  frax: <FraxIcon />,
  gnear: <GnearIcon />,
  gnosis: <GnosisIcon />,
  itlx: <ItlxIcon />,
  knc: <KncIcon />,
  loud: <LoudIcon />,
  ltc: <LtcIcon />,
  mon: <MonIcon />,
  mpdao: <MpdaoIcon />,
  near: <NearIcon />,
  op: <OpIcon />,
  pol: <PolIcon />,
  public: <PublicIcon />,
  sol: <SolIcon />,
  sui: <SuiIcon />,
  ton: <TonIcon />,
  tron: <TronIcon />,
  unknown: <UnknownIcon />,
  xdai: <XdaiIcon />,
  xrp: <XrpIcon />,
  zec: <ZecIcon />,

  // base64 PNG icons
  abg: <img src={AbgIcon} alt="ABG" />,
  jambo: <img src={JamboIcon} alt="JAMBO" />,
  noear: <img src={NoearIcon} alt="NOEAR" />,
  purge: <img src={PurgeIcon} alt="PURGE" />,
  rhea: <img src={RheaIcon} alt="RHEA" />,
  usd1: <img src={Usd1Icon} alt="USD1" />,
  usdf: <img src={UsdfIcon} alt="USDF" />,
  wif: <img src={WifIcon} alt="WIF" />,
};
