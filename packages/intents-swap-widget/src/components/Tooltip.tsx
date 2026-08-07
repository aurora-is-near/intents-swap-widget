import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Content,
  Portal,
  Root,
  TooltipProvider,
  Trigger,
} from '@radix-ui/react-tooltip';
import { InfoW700 as InfoIcon } from '@material-symbols-svg/react-rounded/icons/info';

import { cn } from '@/utils/cn';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCssVariables } from '@/theme/getThemeCssVariables';

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
}: Props) => {
  const theme = useTheme();
  const themeCssVariables = getThemeCssVariables(theme);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={100}>
      <Root open={isOpen} onOpenChange={setIsOpen}>
        <Trigger asChild className={cn('outline-none', className)}>
          {children ?? (
            <button
              type="button"
              className="cursor-pointer p-sw-xs text-sw-gray-400 transition-colors hover:text-sw-gray-100">
              <InfoIcon size={iconSize} />
            </button>
          )}
        </Trigger>
        {/* Radix tears the content down the instant it closes, so the portal and
            content are force-mounted and AnimatePresence owns their lifetime
            instead — that is what gives the exit animation time to play. */}
        <AnimatePresence>
          {isOpen && !isDisabled && !!text.trim() && (
            <Portal forceMount>
              <Content
                forceMount
                sideOffset={6}
                collisionPadding={8}
                className="sw"
                style={{
                  ...themeCssVariables,
                  maxWidth: 250,
                  width: 'max-content',
                  boxSizing: 'border-box',
                }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0.96,
                    y: 4,
                    transition: { duration: 0.1, ease: 'easeIn' },
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 28,
                    mass: 0.7,
                  }}
                  // Scaling out of the origin Radix resolved makes the tooltip
                  // grow from the trigger, so it stays correct on whichever side
                  // collision detection ends up flipping it to.
                  style={{
                    transformOrigin:
                      'var(--radix-tooltip-content-transform-origin)',
                  }}
                  className={cn(
                    'z-50 rounded-sw-md border border-sw-gray-600 bg-sw-gray-800 px-sw-lg py-sw-md shadow-lg',
                    'text-sw-body-sm text-sw-gray-100 leading-relaxed w-full',
                  )}>
                  {text}
                </motion.div>
              </Content>
            </Portal>
          )}
        </AnimatePresence>
      </Root>
    </TooltipProvider>
  );
};
