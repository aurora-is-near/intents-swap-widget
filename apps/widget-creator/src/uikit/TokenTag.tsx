import { cn } from '../utils/cn';
import { HelpCircle } from 'lucide-react';

interface TokenTagProps {
  tokenIcon?: React.ReactNode;
  tokenSymbol: string;
  networkIcon?: React.ReactNode;
  className?: string;
}

/**
 * TokenTag component - displays a token with its symbol and optional network badge
 * Used to display selected tokens in compact form
 */
export function TokenTag({
  tokenIcon,
  tokenSymbol,
  networkIcon,
  className,
}: TokenTagProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-csw-sm px-csw-md py-csw-sm rounded-csw-md',
        'bg-csw-gray-800',
        className,
      )}>
      {/* Token Container */}
      <div className="relative flex items-end shrink-0 w-[30px]">
        {/* Token Icon */}
        {tokenIcon ? (
          <div className="relative shrink-0 size-[28px] mr-[-10px]">
            {tokenIcon}
          </div>
        ) : (
          <div className="relative shrink-0 size-[28px] mr-[-10px] flex items-center justify-center bg-csw-gray-700 rounded-full">
            <HelpCircle className="w-4 h-4 text-csw-gray-950" />
          </div>
        )}

        {/* Network Badge */}
        {networkIcon && (
          <div
            className={cn(
              'relative shrink-0 size-[12px]',
              'rounded-[4px] border-2 border-csw-gray-800 bg-white',
              'mr-[-10px] overflow-clip',
            )}>
            {networkIcon}
          </div>
        )}
      </div>

      {/* Token Symbol Text */}
      <p
        className={cn(
          'font-semibold text-sm leading-4 text-csw-gray-50',
          'tracking-[-0.4px] whitespace-nowrap shrink-0',
        )}>
        {tokenSymbol}
      </p>
    </div>
  );
}
