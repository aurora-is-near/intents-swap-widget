import type { PropsWithChildren, ReactNode } from 'react';

import { Toggle } from '@/uikit/Toggle';

type Props = {
  label: string;
  description: ReactNode;
  isExpanded?: boolean;
  onToggle: (enabled: boolean) => void;
};

export const ExpandableToggleCard = ({
  label,
  children,
  description,
  isExpanded = false,
  onToggle,
}: PropsWithChildren<Props>) => (
  <div className="flex flex-col gap-csw-lg bg-csw-gray-900 rounded-csw-lg p-csw-2xl w-full">
    <header className="flex items-center justify-between w-full">
      <Toggle
        label={label}
        labelPosition="right"
        isEnabled={isExpanded}
        onChange={onToggle}
      />
    </header>
    <p className="text-csw-body-md text-csw-gray-300">{description}</p>
    {isExpanded ? <div className="mt-csw-xl">{children}</div> : null}
  </div>
);
