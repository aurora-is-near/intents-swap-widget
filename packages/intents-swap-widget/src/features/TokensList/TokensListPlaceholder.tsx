import { cn } from '@/utils/cn';
import { Button } from '@/components/Button';

type Props = {
  heading: string;
  subHeading?: string;
  className?: string;
} & (
  | {
      hasAction?: false;
      onClick?: never;
      actionLabel?: never;
      actionType?: never;
    }
  | {
      hasAction: true;
      onClick: () => void;
      actionLabel: string;
      actionType?: 'primary' | 'outlined';
    }
);

export const TokensListPlaceholder = ({
  heading,
  subHeading,
  hasAction = false,
  actionLabel,
  actionType = 'primary',
  className,
  onClick,
}: Props) => (
  <div
    className={cn(
      'py-sw-lg gap-sw-md flex flex-col items-center justify-center',
      className,
    )}>
    <span className="text-sw-label-md text-sw-gray-50">{heading}</span>
    <p className="text-sw-body-md text-sw-gray-300 text-center max-w-[265px]">
      {subHeading}
    </p>
    {hasAction && (
      <Button
        size="md"
        variant={actionType}
        className="w-fit mt-sw-lg"
        onClick={onClick}>
        {actionLabel}
      </Button>
    )}
  </div>
);
