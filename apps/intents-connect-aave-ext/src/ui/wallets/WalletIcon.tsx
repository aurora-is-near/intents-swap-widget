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
    // A white tile in every theme: wallet logos are drawn for light ones.
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="flex-none rounded-control bg-white object-contain p-0.5 shadow-box"
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className="flex flex-none items-center justify-center rounded-control bg-surface-hover font-medium text-text-secondary">
      {name.charAt(0)}
    </span>
  );
