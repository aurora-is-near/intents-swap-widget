import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

import { cn } from '@/utils/cn';
import { Badge } from '@/components/Badge';
import { useTypedTranslation } from '@/localisation';
import type { Token, TokenBalance } from '@/types/token';

import { getBalancePortion } from './utils/getBalancePortion';

const QUICK_ACTIONS_VARIANTS: Variants = {
  hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
  visible: { transition: { staggerChildren: 0.05 } },
};

const QUICK_ACTION_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    y: 6,
    scale: 0.85,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 520, damping: 26 },
  },
};

export type Msg = { type: 'on_change_amount'; amount: string };

type Props = {
  token: Token;
  balance: TokenBalance;
  isClickable: boolean;
  areQuickActionsVisible: boolean;
  className?: string;
  onMsg: (msg: Msg) => void;
};

export const BalanceBadges = ({
  token,
  balance,
  isClickable,
  areQuickActionsVisible,
  className,
  onMsg,
}: Props) => {
  const { t } = useTypedTranslation();

  const onSetPortionOfBalance = (div: number) => {
    onMsg({
      type: 'on_change_amount',
      amount: getBalancePortion(balance, token.decimals, div),
    });
  };

  return (
    <motion.div
      initial={false}
      animate={areQuickActionsVisible ? 'visible' : 'hidden'}
      variants={QUICK_ACTIONS_VARIANTS}
      className={cn(
        'gap-sw-xs flex items-center',
        !areQuickActionsVisible && 'pointer-events-none',
        className,
      )}>
      <motion.div variants={QUICK_ACTION_VARIANTS}>
        <Badge
          isClickable={isClickable}
          onClick={() => onSetPortionOfBalance(2)}>
          {t('tokens.input.half.label', '50%')}
        </Badge>
      </motion.div>
      <motion.div variants={QUICK_ACTION_VARIANTS}>
        <Badge
          isClickable={isClickable}
          onClick={() => onSetPortionOfBalance(1)}>
          {t('tokens.input.max.label', 'Max')}
        </Badge>
      </motion.div>
    </motion.div>
  );
};
