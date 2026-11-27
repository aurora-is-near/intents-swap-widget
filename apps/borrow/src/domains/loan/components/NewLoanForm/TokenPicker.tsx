import { Chip, Text } from '@aurora-is-near/ui-kit';

import { ALL_CHAINS_COLOR, chainOf } from '../../utils/chains';
import { ALL, GROUPS } from './tokenOptions';
import type { FilterValue } from './tokenOptions';

type TokenFiltersProps = {
  /** Shown when set; the Supply picker always has them. */
  groups: boolean;
  /** Chain slugs, in order. */
  chains: readonly string[];
  value: FilterValue;
  onChange: (value: FilterValue) => void;
};

/**
 * The picker's two chip rows (lines 232–241): groups, 8px above the chains,
 * each wrapping with a 6px gap; the chain chips carry the chain's dot.
 */
export function TokenFilters({
  groups,
  chains,
  value,
  onChange,
}: TokenFiltersProps) {
  return (
    <>
      {groups ? (
        <div
          aria-label="Token group"
          className="mb-2 flex flex-wrap gap-1.5"
          role="group">
          {GROUPS.map(({ id, label }) => (
            <Chip
              key={id}
              pressed={value.group === id}
              onClick={() => onChange({ ...value, group: id })}>
              {label}
            </Chip>
          ))}
        </div>
      ) : null}
      <div aria-label="Chain" className="flex flex-wrap gap-1.5" role="group">
        {[ALL, ...chains].map((slug) => (
          <Chip
            key={slug}
            dotColor={slug === ALL ? ALL_CHAINS_COLOR : chainOf(slug).color}
            pressed={value.chain === slug}
            onClick={() => onChange({ ...value, chain: slug })}>
            {slug === ALL ? 'All chains' : chainOf(slug).name}
          </Chip>
        ))}
      </div>
    </>
  );
}

/** The section labels (lines 216, 256): 12px, 0.14em, `mut2`. */
export function SectionLabel({
  id,
  children,
}: {
  id: string;
  children: string;
}) {
  return (
    <Text className="mb-2 leading-font" id={id} variant="label">
      {children}
    </Text>
  );
}

/**
 * A picker trigger's name: its section, then what it shows ("SUPPLY WETH
 * Base"), so the two triggers are told apart.
 */
export const triggerLabel = (sectionId: string, triggerId: string) =>
  `${sectionId} ${triggerId}`;
