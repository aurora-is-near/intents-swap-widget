import { Chip } from '../components/Chip/Chip';

/*
 * The token picker's filter rows, shared by the Chip and TokenSelect
 * stories. Story-only: not exported from the kit.
 */

/** Chains from the artboard's sample data (Web-Borrow.dc.html lines 1098–1111). */
export const CHAINS = {
  eth: { name: 'Ethereum', color: '#5B74D6' },
  base: { name: 'Base', color: '#2E6BFF' },
  arb: { name: 'Arbitrum', color: '#1F8FD6' },
  op: { name: 'Optimism', color: '#D9341F' },
} as const;

export type ChainId = keyof typeof CHAINS;

const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

export type Group = 'all' | 'eth' | 'btc' | 'stable';

const GROUPS: { id: Group; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'eth', label: 'ETH' },
  { id: 'btc', label: 'BTC' },
  { id: 'stable', label: 'Stables' },
];

type FilterChipsProps = {
  group: Group;
  onGroupChange: (group: Group) => void;
  chain: ChainId;
  onChainChange: (chain: ChainId) => void;
};

/** A token group row and a chain row, one chip pressed in each. */
export function FilterChips({
  group,
  onGroupChange,
  chain,
  onChainChange,
}: FilterChipsProps) {
  return (
    <>
      <div
        aria-label="Token group"
        className="mb-2 flex flex-wrap gap-1.5"
        role="group">
        {GROUPS.map((item) => (
          <Chip
            key={item.id}
            onClick={() => onGroupChange(item.id)}
            pressed={group === item.id}>
            {item.label}
          </Chip>
        ))}
      </div>
      <div aria-label="Chain" className="flex flex-wrap gap-1.5" role="group">
        {CHAIN_IDS.map((id) => (
          <Chip
            dotColor={CHAINS[id].color}
            key={id}
            onClick={() => onChainChange(id)}
            pressed={chain === id}>
            {CHAINS[id].name}
          </Chip>
        ))}
      </div>
    </>
  );
}
