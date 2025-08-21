type Props = {
  width?: number;
  height?: number;
  radius?: 'full' | 'sm' | 'md' | 'lg' | number;
};

export const Skeleton = ({
  width = 100,
  height = 20,
  radius = 'full',
}: Props) => (
  // for some reason w-[${width}px] doesn't work so we use inline style
  <div
    className={`h-[${height}px] animate-pulse rounded-${Number.isInteger(radius) ? `${radius}px` : radius} bg-gray-600`}
    style={{ width }}
  />
);
