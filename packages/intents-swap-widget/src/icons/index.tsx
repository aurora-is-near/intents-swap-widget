/* eslint-disable import/extensions */
import AbgIcon from './abg.svg?react';
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
import JamboIcon from './jambo.svg?react';
import KncIcon from './knc.svg?react';
import LoudIcon from './loud.svg?react';
import LtcIcon from './ltc.svg?react';
import MonIcon from './mon.svg?react';
import MpdaoIcon from './mpdao.svg?react';
import NearIcon from './near.svg?react';
import NoearIcon from './noear.svg?react';
import OpIcon from './op.svg?react';
import PolIcon from './pol.svg?react';
import PublicIcon from './public.svg?react';
import PurgeIcon from './purge.svg?react';
import RheaIcon from './rhea.svg?react';
import SolIcon from './sol.svg?react';
import SuiIcon from './sui.svg?react';
import TonIcon from './ton.svg?react';
import TronIcon from './tron.svg?react';
import UnknownIcon from './unknown.svg?react';
import Usd1Icon from './usd1.svg?react';
import UsdfIcon from './usdf.svg?react';
import WifIcon from './wif.svg?react';
import XdaiIcon from './xdai.svg?react';
import XrpIcon from './xrp.svg?react';
import ZecIcon from './zec.svg?react';

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
  abg: <AbgIcon />,
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
  jambo: <JamboIcon />,
  knc: <KncIcon />,
  loud: <LoudIcon />,
  ltc: <LtcIcon />,
  mon: <MonIcon />,
  mpdao: <MpdaoIcon />,
  near: <NearIcon />,
  noear: <NoearIcon />,
  op: <OpIcon />,
  pol: <PolIcon />,
  public: <PublicIcon />,
  purge: <PurgeIcon />,
  rhea: <RheaIcon />,
  sol: <SolIcon />,
  sui: <SuiIcon />,
  ton: <TonIcon />,
  tron: <TronIcon />,
  usd1: <Usd1Icon />,
  usdf: <UsdfIcon />,
  unknown: <UnknownIcon />,
  wif: <WifIcon />,
  xdai: <XdaiIcon />,
  xrp: <XrpIcon />,
  zec: <ZecIcon />,
};
