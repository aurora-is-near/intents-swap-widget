import { cn } from '@aurora-is-near/intents-swap-widget/utils';

export type TabDefinition<TId extends string> = { id: TId; label: string };

export const Tabs = <TId extends string>({
  tabs,
  active,
  isLocked,
  onChange,
}: {
  tabs: readonly TabDefinition<TId>[];
  active: TId;
  /**
   * Switching unmounts the active integration, which disposes its execution
   * runner and stops polling a deposit that is still in flight. So while one is
   * running, the other tab is simply not available.
   */
  isLocked: boolean;
  onChange: (id: TId) => void;
}) => (
  <div
    role="tablist"
    className="flex gap-sw-xs p-sw-xs mx-auto mb-sw-xl w-fit rounded-sw-md bg-sw-gray-900">
    {tabs.map(({ id, label }) => {
      const isActive = id === active;

      return (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={isActive}
          disabled={isLocked && !isActive}
          title={
            isLocked && !isActive
              ? 'Finish or cancel the running deposit first'
              : undefined
          }
          onClick={() => onChange(id)}
          className={cn(
            'px-sw-xl py-sw-md rounded-sw-sm text-sw-label-md transition-colors',
            {
              'bg-sw-gray-50 text-sw-gray-950': isActive,
              'text-sw-gray-300 hover:text-sw-gray-100 hover:bg-sw-gray-800 cursor-pointer':
                !isActive && !isLocked,
              'text-sw-gray-500 cursor-not-allowed': !isActive && isLocked,
            },
          )}>
          {label}
        </button>
      );
    })}
  </div>
);
