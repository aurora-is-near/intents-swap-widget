import { type ReactNode, useEffect, useRef, useState } from 'react';

import {
  AmountInput,
  Badge,
  Banner,
  Button,
  Card,
  ChainMark,
  ChainMarkGroup,
  Checkbox,
  Chip,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Highlight,
  QuickAmounts,
  RISK_ZONE_COLORS,
  Skeleton,
  Slider,
  Spinner,
  StepProgress,
  Switch,
  Tab,
  Tabs,
  TabsList,
  TabsPanel,
  Tag,
  Text,
  TextField,
  TokenMark,
  TokenSelect,
  Tooltip,
  TooltipProvider,
} from '../index';
import type {
  ButtonVariant,
  ResolvedTheme,
  Step,
  ThemeContextValue,
  ThemePreference,
  TokenOption,
} from '../index';

// Class names are spelled out so Tailwind finds them in this file.
const TOKENS = [
  { name: 'sf', className: 'bg-sf' },
  { name: 'sf2', className: 'bg-sf2' },
  { name: 'sf3', className: 'bg-sf3' },
  { name: 'hov', className: 'bg-hov' },
  { name: 'tint', className: 'bg-tint' },
  { name: 'track', className: 'bg-track' },
  { name: 'bd', className: 'bg-bd' },
  { name: 'bd2', className: 'bg-bd2' },
  { name: 'mid', className: 'bg-mid' },
  { name: 'mid2', className: 'bg-mid2' },
  { name: 'limebd', className: 'bg-limebd' },
  { name: 'ink', className: 'bg-ink' },
  { name: 'mut', className: 'bg-mut' },
  { name: 'mut2', className: 'bg-mut2' },
  { name: 'mut3', className: 'bg-mut3' },
  { name: 'pos', className: 'bg-pos' },
  { name: 'neg', className: 'bg-neg' },
  { name: 'warn', className: 'bg-warn' },
  { name: 'warnbd', className: 'bg-warnbd' },
  { name: 'warnbg', className: 'bg-warnbg' },
  { name: 'negbg', className: 'bg-negbg' },
  { name: 'onlime', className: 'bg-onlime' },
  { name: 'badge', className: 'bg-badge' },
  { name: 'accent', className: 'bg-accent' },
] as const;

const TYPE_SCALE = [
  { name: 'h64', className: 'text-h64 font-extrabold' },
  { name: 'h56', className: 'text-h56 font-extrabold' },
  { name: 'h44', className: 'text-h44 font-extrabold' },
  { name: 'big', className: 'text-big font-semibold' },
] as const;

const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

const WEIGHTS = [
  { weight: 500, className: 'font-medium' },
  { weight: 600, className: 'font-semibold' },
  { weight: 700, className: 'font-bold' },
  { weight: 800, className: 'font-extrabold' },
] as const;

/**
 * Reads a token's computed value, so the swatch shows the hex it resolves to.
 * A passive effect, because it runs after ThemeProvider's layout effect has
 * written the new data-theme (a ref or child layout effect runs before it).
 */
function TokenValue({ name, theme }: { name: string; theme: ResolvedTheme }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(
      getComputedStyle(document.documentElement)
        .getPropertyValue(`--${name}`)
        .trim(),
    );
  }, [name, theme]);

  return <code className="text-xs text-mut2">{value}</code>;
}

function Tokens({ theme }: { theme: ResolvedTheme }) {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-0">
      {TOKENS.map(({ name, className }) => (
        <li className="flex flex-col gap-1" key={name}>
          <div
            className={`h-14 rounded-xl border-[1.5px] border-bd ${className}`}
          />
          <span className="text-sm font-bold">--{name}</span>
          <TokenValue name={name} theme={theme} />
        </li>
      ))}
    </ul>
  );
}

function Type() {
  return (
    <div className="flex flex-col gap-2">
      {TYPE_SCALE.map(({ name, className }) => (
        <p className={`m-0 leading-[1.05] ${className}`} key={name}>
          {name}: Borrow
        </p>
      ))}
      <p className="m-0 flex flex-wrap gap-4 text-lg">
        {WEIGHTS.map(({ weight, className }) => (
          <span className={className} key={weight}>
            Schibsted {weight}
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * Sample marks, from the artboard's script data (`EX`). The real palette is
 * app data, not the kit's.
 */
const MARKS = [
  { label: 'BT', bg: '#FFE2A8', fg: '#4A3000' },
  { label: 'ET', bg: '#DAD9F7', fg: '#25235C' },
  { label: 'US', bg: '#D3F2DF', fg: '#0C4325' },
  { label: 'UC', bg: '#C7E0FF', fg: '#0B2E5C' },
] as const;

const SIZED_VARIANTS: readonly ButtonVariant[] = [
  'primary',
  'accent',
  'danger',
];

function Buttons() {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {SIZED_VARIANTS.map((variant) => (
          <div className="flex flex-col gap-3" key={variant}>
            <Text variant="label">{variant.toUpperCase()}</Text>
            <Button variant={variant}>Borrow USDC</Button>
            <Button disabled variant={variant}>
              Disabled
            </Button>
            <Button loading variant={variant}>
              Borrowing
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button size="md" variant={variant}>
                Start a new loan
              </Button>
              <Button disabled size="md" variant={variant}>
                Disabled
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary">Max</Button>
        <Button disabled variant="secondary">
          Disabled
        </Button>
        <Button variant="ghost">Positions</Button>
        <Button disabled variant="ghost">
          Disabled
        </Button>
      </div>
    </>
  );
}

function Toggles() {
  const [sendOther, setSendOther] = useState(false);
  const [recvOther, setRecvOther] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <Checkbox
        checked={sendOther}
        label="Send borrowed funds to another wallet"
        onCheckedChange={setSendOther}
      />
      <Switch
        checked={recvOther}
        label="Send to another wallet"
        onCheckedChange={setRecvOther}
      />
      <div className="flex flex-wrap items-center gap-6">
        <Checkbox aria-label="Unlabelled checkbox" />
        <Switch aria-label="Unlabelled switch" />
        <Checkbox disabled label="Disabled" />
        <Checkbox checked disabled label="Disabled, checked" />
        <Switch disabled label="Disabled" />
        <Switch checked disabled label="Disabled, on" />
      </div>
    </div>
  );
}

function TextFields() {
  const [address, setAddress] = useState('');

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      <TextField
        hideLabel
        label="Recipient wallet address"
        onChange={(event) => setAddress(event.target.value)}
        placeholder="0x… or name.eth"
        value={address}
      />
      <TextField label="RECIPIENT" placeholder="0x… or name.eth" />
      <TextField
        defaultValue="0x12"
        error="Not a valid address"
        label="WITH AN ERROR"
      />
      <TextField disabled label="DISABLED" placeholder="0x… or name.eth" />
    </div>
  );
}

const QUICK_AMOUNTS = [
  { value: '0.25', label: '25%' },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1', label: 'Max' },
];

/** Sample balance for the quick-amount chips. */
const BALANCE = 2.5;

function Amounts() {
  const [amount, setAmount] = useState('');
  const [share, setShare] = useState<string>();

  return (
    <div className="flex max-w-[560px] flex-col gap-3">
      <AmountInput
        decimals={6}
        hideLabel
        label="Collateral amount"
        onValueChange={(value) => {
          setAmount(value);
          setShare(undefined);
        }}
        secondary="≈ $1,234.00"
        value={amount}
      />
      <QuickAmounts
        aria-label="Share of balance"
        onSelect={(value) => {
          setShare(value);
          setAmount(String(BALANCE * Number(value)));
        }}
        options={QUICK_AMOUNTS}
        value={share}
      />
      <AmountInput
        label="SUPPLY"
        onValueChange={() => undefined}
        secondary="Disabled"
        disabled
        value="1.5"
      />
    </div>
  );
}

/** Chains and tokens from the artboard's sample data (Web-Borrow.dc.html lines 1098–1111). */
const CHAINS = {
  eth: { name: 'Ethereum', color: '#5B74D6' },
  base: { name: 'Base', color: '#2E6BFF' },
  arb: { name: 'Arbitrum', color: '#1F8FD6' },
  op: { name: 'Optimism', color: '#D9341F' },
} as const;

type ChainId = keyof typeof CHAINS;

type Group = 'all' | 'eth' | 'btc' | 'stable';

const GROUPS: { id: Group; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'eth', label: 'ETH' },
  { id: 'btc', label: 'BTC' },
  { id: 'stable', label: 'Stables' },
];

const SAMPLE_TOKENS: {
  id: string;
  symbol: string;
  label: string;
  bg: string;
  fg: string;
  price: string;
  group: Exclude<Group, 'all'>;
  chains: ChainId[];
}[] = [
  {
    id: 'wsteth',
    symbol: 'wstETH',
    label: 'ws',
    bg: '#BFE3FF',
    fg: '#0B3350',
    price: '$3,600.00',
    group: 'eth',
    chains: ['eth', 'base', 'arb', 'op'],
  },
  {
    id: 'eth',
    symbol: 'ETH',
    label: 'ET',
    bg: '#DAD9F7',
    fg: '#25235C',
    price: '$3,000.00',
    group: 'eth',
    chains: ['eth', 'base', 'arb', 'op'],
  },
  {
    id: 'weeth',
    symbol: 'weETH',
    label: 'we',
    bg: '#E3D4F7',
    fg: '#3B1F63',
    price: '$3,150.00',
    group: 'eth',
    chains: ['eth', 'base', 'arb'],
  },
  {
    id: 'wbtc',
    symbol: 'WBTC',
    label: 'WB',
    bg: '#FFE2A8',
    fg: '#4A3000',
    price: '$90,000.00',
    group: 'btc',
    chains: ['eth', 'arb', 'op'],
  },
  {
    id: 'cbbtc',
    symbol: 'cbBTC',
    label: 'cb',
    bg: '#C9D7FF',
    fg: '#14275E',
    price: '$90,000.00',
    group: 'btc',
    chains: ['eth', 'base', 'arb'],
  },
  {
    id: 'susds',
    symbol: 'sUSDS',
    label: 'sU',
    bg: '#FFD0E4',
    fg: '#5E0B33',
    price: '$1.08',
    group: 'stable',
    chains: ['eth', 'base', 'arb'],
  },
  {
    id: 'usds',
    symbol: 'USDS',
    label: 'US',
    bg: '#D3F2DF',
    fg: '#0C4325',
    price: '$1.00',
    group: 'stable',
    chains: ['eth', 'base', 'arb'],
  },
];

const toOption = (token: (typeof SAMPLE_TOKENS)[number]): TokenOption => ({
  id: token.id,
  symbol: token.symbol,
  mark: { label: token.label, bg: token.bg, fg: token.fg },
  chainsLabel: token.chains.map((chain) => CHAINS[chain].name).join(' · '),
  priceLabel: token.price,
});

/** The Supply card's picker row (lines 216–228): trigger and amount field. */
function TokenPicker() {
  const anchor = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('eth');
  // The chain on the trigger changes only with a pick, so it always pairs
  // with a chain the selected token is on; the chips set the filter.
  const [chain, setChain] = useState<ChainId>('eth');
  const [filterChain, setFilterChain] = useState<ChainId>('eth');
  const [group, setGroup] = useState<Group>('all');
  const [amount, setAmount] = useState('');

  const token = SAMPLE_TOKENS.find((item) => item.id === value);

  const options = SAMPLE_TOKENS.filter(
    (item) =>
      (group === 'all' || item.group === group) &&
      item.chains.includes(filterChain),
  ).map(toOption);

  if (!token) {
    return null;
  }

  return (
    <div ref={anchor} className="flex max-w-[560px] items-stretch gap-2">
      <TokenSelect
        anchor={anchor}
        aria-label="Choose collateral token"
        className="w-[188px] shrink-0"
        filters={
          <>
            <div
              aria-label="Token group"
              className="mb-[8px] flex flex-wrap gap-[6px]"
              role="group">
              {GROUPS.map((item) => (
                <Chip
                  key={item.id}
                  onClick={() => setGroup(item.id)}
                  pressed={group === item.id}>
                  {item.label}
                </Chip>
              ))}
            </div>
            <div
              aria-label="Chain"
              className="flex flex-wrap gap-[6px]"
              role="group">
              {(Object.keys(CHAINS) as ChainId[]).map((id) => (
                <Chip
                  dotColor={CHAINS[id].color}
                  key={id}
                  onClick={() => setFilterChain(id)}
                  pressed={filterChain === id}>
                  {CHAINS[id].name}
                </Chip>
              ))}
            </div>
          </>
        }
        onValueChange={(id) => {
          setValue(id);
          setChain(filterChain);
        }}
        options={options}
        selected={{
          symbol: token.symbol,
          mark: { label: token.label, bg: token.bg, fg: token.fg },
          chainName: CHAINS[chain].name,
          chainColor: CHAINS[chain].color,
        }}
        value={value}
      />
      <AmountInput
        className="min-w-0 flex-1"
        hideLabel
        label="Collateral amount"
        onValueChange={setAmount}
        secondary="≈ $0.00"
        value={amount}
      />
    </div>
  );
}

/** The artboard's LTV zones end at 50, 65, 80 and 90 (line 304). */
const LTV_MAX = 90;
const LTV_ZONES = [50, 65, 80, 90].map((upTo, index) => ({
  upTo,
  color: RISK_ZONE_COLORS[index] ?? RISK_ZONE_COLORS[0],
}));

const LIQ_LTV = 83;
const REPAY_AMOUNTS = [
  { value: '25', label: '25%' },
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '100', label: 'Max' },
];

function Sliders() {
  const [ltv, setLtv] = useState(40);
  const [repay, setRepay] = useState(50);

  return (
    <div className="flex max-w-[460px] flex-col gap-6">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-semibold text-mut">
            Loan to value
          </span>
          <span className="text-[28px] font-extrabold tracking-[-0.03em]">
            {ltv}%
          </span>
        </div>
        <Slider
          aria-label="Loan to value, percent"
          className="mt-[22px]"
          getAriaValueText={(_formatted, value) => `${value} percent`}
          marker={{ value: LIQ_LTV, label: `liq. ${LIQ_LTV}%` }}
          max={LTV_MAX}
          onValueChange={setLtv}
          value={ltv}
          zones={LTV_ZONES}
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-semibold text-mut">
            Amount to repay
          </span>
          <span className="text-[28px] font-extrabold tracking-[-0.03em]">
            {repay}%
          </span>
        </div>
        <Slider
          aria-label="Percent of debt to repay"
          onValueChange={setRepay}
          value={repay}
        />
        <QuickAmounts
          aria-label="Repay presets"
          className="mt-[10px]"
          onSelect={(value) => setRepay(Number(value))}
          options={REPAY_AMOUNTS}
          value={String(repay)}
        />
      </div>
      <Slider aria-label="Disabled slider" defaultValue={30} disabled />
    </div>
  );
}

/** Closes the non-dismissible dialog, as the app does once signing ends. */
const SIGNING_MS = 4000;

function Dialogs() {
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!signing) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSigning(false), SIGNING_MS);

    return () => window.clearTimeout(timer);
  }, [signing]);

  return (
    <div className="flex flex-wrap gap-3">
      <Dialog>
        <DialogTrigger render={<Button size="md" />}>Review loan</DialogTrigger>
        <DialogContent>
          <DialogTitle>Confirm loan</DialogTitle>
          <DialogDescription>
            Borrow 1,000 USDC against 1 ETH.
          </DialogDescription>
          <div className="mt-[16px] rounded-[18px] bg-sf2 px-[16px] py-[11px] text-[15px] text-mut">
            Loan summary rows go here.
          </div>
          <DialogClose render={<Button className="mt-[20px]" />}>
            Confirm in wallet
          </DialogClose>
        </DialogContent>
      </Dialog>
      <Dialog dismissible={false} onOpenChange={setSigning} open={signing}>
        <DialogTrigger render={<Button size="md" variant="secondary" />}>
          Sign (not dismissible)
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Waiting for signature</DialogTitle>
          <DialogDescription>
            Escape and outside presses are ignored. Closes in{' '}
            {SIGNING_MS / 1000} seconds.
          </DialogDescription>
          <div className="mt-[16px] flex items-center gap-[12px] text-[15px] font-semibold">
            <Spinner size={20} /> Confirm in your wallet
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabsDemo() {
  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="new">
        <TabsList aria-label="Borrow views">
          <Tab value="new">New loan</Tab>
          <Tab count={2} value="positions">
            My positions
          </Tab>
        </TabsList>
        <TabsPanel className="mt-[20px] text-mut" value="new">
          New loan form
        </TabsPanel>
        <TabsPanel className="mt-[20px] text-mut" value="positions">
          Two open positions
        </TabsPanel>
      </Tabs>
      <Tabs defaultValue="deposit">
        <TabsList aria-label="Vault action">
          <Tab value="deposit">Deposit</Tab>
          <Tab disabled value="withdraw">
            Withdraw
          </Tab>
        </TabsList>
      </Tabs>
    </div>
  );
}

/** The confirm modal's banners (lines 985–994) and the position's (line 409). */
function Banners() {
  return (
    <div className="flex max-w-[460px] flex-col gap-4">
      <Banner title="Transaction failed" tone="danger">
        The wallet rejected the request. Nothing was sent.
      </Banner>
      <Banner title="Taking longer than usual" tone="warning">
        The bridge is still settling. You can close this window; the loan
        finishes on its own.
      </Banner>
      <Banner tinted title="Close to liquidation" tone="danger">
        Health factor 1.08. Add collateral or repay part of the loan.
        <div className="mt-[12px] flex flex-wrap gap-[8px]">
          <Button variant="secondary">Add collateral</Button>
          <Button variant="secondary">Repay part</Button>
        </div>
      </Banner>
    </div>
  );
}

const PENDING_STEPS: readonly Step[] = [
  { label: 'Approve WETH', status: 'done' },
  { label: 'Supply collateral', status: 'active' },
  { label: 'Borrow USDC', status: 'waiting' },
];

const FAILED_STEPS: readonly Step[] = [
  { label: 'Approve WETH', status: 'done' },
  { label: 'Supply collateral', status: 'failed' },
  { label: 'Borrow USDC', status: 'waiting' },
];

/** The confirm modal's steps (lines 1001–1011). */
function Steps() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
      <StepProgress aria-label="Loan progress" steps={PENDING_STEPS} />
      <StepProgress aria-label="Failed loan progress" steps={FAILED_STEPS} />
    </div>
  );
}

/** A token row while prices load: mark, two lines, price. */
function Skeletons() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading tokens"
      className="flex max-w-[460px] flex-col gap-3"
      role="group">
      {[0, 1].map((row) => (
        <div className="flex items-center gap-[12px]" key={row}>
          <Skeleton height={34} radius="full" width={34} />
          <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <Skeleton height={16} width="40%" />
            <Skeleton height={12} width="70%" />
          </div>
          <Skeleton height={16} width={64} />
        </div>
      ))}
    </div>
  );
}

function Tooltips() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tooltip content="Variable annual rate, paid in the borrowed token.">
        <Button variant="secondary">APR</Button>
      </Tooltip>
      <Tooltip
        content="The loan is liquidated when its loan to value reaches this line."
        side="bottom">
        <Button variant="ghost">Liquidation LTV</Button>
      </Tooltip>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="label">
        {title.toUpperCase()}
      </Text>
      {children}
    </section>
  );
}

function Components() {
  return (
    <div className="flex flex-col gap-8">
      <Section title="Text">
        <Text variant="h64">
          Borrow <Highlight>easy</Highlight>
        </Text>
        <Text variant="h56">Earn on stables</Text>
        <Text variant="h44">Steakhouse USDC</Text>
        <Text variant="big">1,250.00</Text>
        <Text variant="label">ACTIVE LOAN</Text>
      </Section>

      <Section title="Card">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          <Card>
            <Text variant="label">DEFAULT</Text>
            <p className="mt-2 mb-0">1.5px --bd border, 24px radius.</p>
          </Card>
          <Card variant="tint">
            <Text variant="label">TINT</Text>
            <p className="mt-2 mb-0">--tint surface, --limebd border.</p>
          </Card>
        </div>
      </Section>

      <Section title="Button">
        <Buttons />
      </Section>

      <Section title="Checkbox and Switch">
        <Toggles />
      </Section>

      <Section title="TextField">
        <TextFields />
      </Section>

      <Section title="AmountInput and QuickAmounts">
        <Amounts />
      </Section>

      <Section title="TokenSelect and Chip">
        <TokenPicker />
      </Section>

      <Section title="Slider">
        <Sliders />
      </Section>

      <Section title="Tabs">
        <TabsDemo />
      </Section>

      <Section title="Dialog">
        <Dialogs />
      </Section>

      <Section title="Banner">
        <Banners />
      </Section>

      <Section title="StepProgress">
        <Steps />
      </Section>

      <Section title="Skeleton">
        <Skeletons />
      </Section>

      <Section title="Tooltip">
        <Tooltips />
      </Section>

      <Section title="Spinner">
        <div className="flex flex-wrap items-center gap-6">
          <Spinner />
          <Spinner size={20} />
          <span className="flex items-center gap-2 text-neg">
            <Spinner tone="current" /> current colour
          </span>
        </div>
      </Section>

      <Section title="Badge and Tag">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="best">USDC</Badge>
          <Badge variant="neutral">Aave V3</Badge>
          <Badge variant="count">2</Badge>
          <Tag tone="positive">Active</Tag>
          <Tag tone="warn">Watch</Tag>
          <Tag tone="risk">At risk</Tag>
          <Tag tone="neutral">Closed</Tag>
        </div>
      </Section>

      <Section title="Token and chain marks">
        <div className="flex flex-wrap items-center gap-3">
          {MARKS.map((mark) => (
            <TokenMark key={mark.label} {...mark} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <ChainMarkGroup>
            {MARKS.map((mark) => (
              <ChainMark key={mark.label} {...mark} />
            ))}
          </ChainMarkGroup>
          <div className="rounded-[18px] bg-sf2 px-[18px] py-[16px]">
            <ChainMarkGroup size={32}>
              {MARKS.map((mark) => (
                <ChainMark key={mark.label} {...mark} />
              ))}
            </ChainMarkGroup>
          </div>
        </div>
      </Section>
    </div>
  );
}

/** System / light / dark, as a radio group so it works from the keyboard. */
function ThemeSwitch({ preference, theme, setPreference }: ThemeContextValue) {
  return (
    <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
      <legend className="sr-only">Theme</legend>
      {PREFERENCES.map((option) => (
        <label
          className="cursor-pointer rounded-full border-[1.5px] border-bd2 bg-sf px-[18px] py-[9px] text-[15px] font-bold capitalize hover:border-ink has-checked:border-ink has-checked:bg-ink has-checked:text-sf has-focus-visible:outline-[3px] has-focus-visible:outline-offset-2 has-focus-visible:outline-ink has-focus-visible:outline-solid"
          key={option}>
          <input
            checked={preference === option}
            className="sr-only"
            name="theme"
            onChange={() => setPreference(option)}
            type="radio"
            value={option}
          />
          {option}
        </label>
      ))}
      <span className="text-sm text-mut2">Resolved: {theme}</span>
    </fieldset>
  );
}

type GalleryProps = {
  /**
   * The value of `useTheme()`, passed in rather than read here: the app
   * consumes the kit from `dist` and this file from source, two copies of the
   * theme context, so a hook called here would not find the app's provider.
   */
  theme: ThemeContextValue;
};

/** Every kit token and component on one page, for the playground and the app's dev-only /gallery. */
export function Gallery({ theme }: GalleryProps) {
  return (
    <TooltipProvider>
      <main className="flex min-h-screen flex-col gap-6 bg-sf p-6 font-sans text-ink">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="m-0 text-xs font-semibold tracking-[0.14em] text-mut2 uppercase">
            UI kit playground
          </h1>
          <ThemeSwitch {...theme} />
        </header>
        <Tokens theme={theme.theme} />
        <Type />
        <Components />
      </main>
    </TooltipProvider>
  );
}
