/** Marks the account's primary wallet in wallet lists and selectors. */
export const PrimaryBadge = ({ label = 'Primary' }: { label?: string }) => (
  <span className="shrink-0 rounded-full bg-sw-accent-950 px-sw-sm py-[1px] text-sw-label-sm text-sw-accent-600">
    {label}
  </span>
);
