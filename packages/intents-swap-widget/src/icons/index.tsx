/* eslint-disable import/extensions */
import { ReactElement, SVGAttributes } from 'react';
import AbgIcon from './abg.svg';
import AdaIcon from './ada.svg';
import AdiIcon from './adi.svg';
import ArbIcon from './arb.svg';
import AsterIcon from './aster.svg';
import AvaxIcon from './avax.svg';
import BaseIcon from './base.svg';
import BeraIcon from './bera.svg';
import BnbIcon from './bnb.svg';
import BscIcon from './bsc.svg';
import BtcIcon from './btc.svg';
import CardanoIcon from './cardano.svg';
import DaiIcon from './dai.svg';
import DogeIcon from './doge.svg';
import EthIcon from './eth.svg';
import EureIcon from './eure.svg';
import FraxIcon from './frax.svg';
import GbpeIcon from './gbpe.svg';
import GnearIcon from './gnear.svg';
import GnosisIcon from './gnosis.svg';
import ItlxIcon from './itlx.svg';
import JamboIcon from './jambo.svg';
import KncIcon from './knc.svg';
import LoudIcon from './loud.svg';
import LtcIcon from './ltc.svg';
import MonIcon from './mon.svg';
import MpdaoIcon from './mpdao.svg';
import NearIcon from './near.svg';
import NoearIcon from './noear.svg';
import NproIcon from './npro.svg';
import OpIcon from './op.svg';
import PolIcon from './pol.svg';
import PublicIcon from './public.svg';
import PurgeIcon from './purge.svg';
import RheaIcon from './rhea.svg';
import { SolIcon } from './SolIcon';
import SuiIcon from './sui.svg';
import TonIcon from './ton.svg';
import TronIcon from './tron.svg';
import UnknownIcon from './unknown.svg';
import Usd1Icon from './usd1.svg';
import UsdcIcon from './usdc.svg';
import UsdfIcon from './usdf.svg';
import UsdtIcon from './usdt.svg';
import WbtcIcon from './wbtc.svg';
import WifIcon from './wif.svg';
import XbtcIcon from './xbtc.svg';
import XdaiIcon from './xdai.svg';
import XrpIcon from './xrp.svg';
import ZecIcon from './zec.svg';

import type { Chains } from '@/types/chain';

export const UNKNOWN_ICON: React.ReactElement = <UnknownIcon />;

export const CHAIN_ICONS: Record<
  Chains,
  ReactElement<SVGAttributes<SVGElement>>
> = {
  arb: <ArbIcon />,
  avax: <AvaxIcon />,
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
  ada: <AdaIcon />,
  adi: <AdiIcon />,
  arb: <ArbIcon />,
  aster: <AsterIcon />,
  avax: <AvaxIcon />,
  base: <BaseIcon />,
  bera: <BeraIcon />,
  bnb: <BnbIcon />,
  bsc: <BscIcon />,
  btc: <BtcIcon />,
  cardano: <CardanoIcon />,
  dai: <DaiIcon />,
  doge: <DogeIcon />,
  eth: <EthIcon />,
  eure: <EureIcon />,
  frax: <FraxIcon />,
  gbpe: <GbpeIcon />,
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
  npro: <NproIcon />,
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
  usdc: <UsdcIcon />,
  usdf: <UsdfIcon />,
  usdt: <UsdtIcon />,
  unknown: <UnknownIcon />,
  wbtc: <WbtcIcon />,
  wif: <WifIcon />,
  xbtc: <XbtcIcon />,
  xdai: <XdaiIcon />,
  xrp: <XrpIcon />,
  zec: <ZecIcon />,
};
