/** A wallet's own icon (data URI or URL), with a letter fallback. */
export const WalletIcon = ({
  name,
  icon,
  size = 32,
}: {
  name: string;
  icon?: string;
  size?: number;
}) =>
  icon ? (
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="flex-none rounded-lg bg-white object-contain p-0.5 shadow-box"
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className="flex flex-none items-center justify-center rounded-lg bg-surface-hover font-medium text-text-secondary">
      {name.charAt(0)}
    </span>
  );
