import {
  Content,
  Portal,
  Root,
  TooltipProvider,
  Trigger,
} from '@radix-ui/react-tooltip';
import { InfoW700 as InfoIcon } from '@material-symbols-svg/react-rounded/icons/info';

import { cn } from '@/utils/cn';

type Props = {
  text: string;
  isDisabled?: boolean;
  className?: string;
} & (
  | { iconSize?: number; children?: never }
  | { children: React.ReactNode; iconSize?: never }
);

export const Tooltip = ({
  className,
  isDisabled = false,
  iconSize = 16,
  children,
  text,
}: Props) => (
  <TooltipProvider delayDuration={200} skipDelayDuration={100}>
    <Root>
      <Trigger asChild className={cn('outline-none', className)}>
        {children ?? (
          <button
            type="button"
            className="cursor-pointer p-sw-xs text-sw-gray-400 transition-colors hover:text-sw-gray-100">
            <InfoIcon size={iconSize} />
          </button>
        )}
      </Trigger>
      <Portal>
        {isDisabled ? null : (
          <Content
            sideOffset={6}
            collisionPadding={8}
            className="sw"
            style={{
              maxWidth: 250,
              width: 'max-content',
              boxSizing: 'border-box',
            }}>
            <div
              className={cn(
                'z-50 rounded-sw-md border border-sw-gray-600 bg-sw-gray-800 px-sw-lg py-sw-md shadow-lg',
                'text-sw-body-sm text-sw-gray-100 leading-relaxed w-full',
              )}>
              {text}
            </div>
          </Content>
        )}
      </Portal>
    </Root>
  </TooltipProvider>
);
