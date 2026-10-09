import type { Integration } from '../apps/registry';

/** An app's mark: its initial on its brand color (no logo assets yet). */
export const AppMark = ({
  app,
  size = 40,
}: {
  app: Pick<Integration, 'name' | 'accent'>;
  size?: number;
}) => (
  <span
    aria-hidden="true"
    className="flex shrink-0 items-center justify-center rounded-sw-md font-semibold text-[#fff]"
    style={{
      width: size,
      height: size,
      background: app.accent,
      fontSize: Math.round(size * 0.45),
    }}>
    {app.name.slice(0, 1)}
  </span>
);
