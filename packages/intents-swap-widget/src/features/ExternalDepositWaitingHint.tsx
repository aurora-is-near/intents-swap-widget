import { useEffect, useState } from 'react';

import { Banner } from '@/components';
import { useTypedTranslation } from '@/localisation';
import { useUnsafeSnapshot } from '@/machine/snap';

const WAITING_HINT_DELAY_MS = 90_000;

export const ExternalDepositWaitingHint = () => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();

  const isWaiting =
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    !!ctx.quote &&
    !ctx.externalDepositTxReceived &&
    !ctx.error;

  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!isWaiting) {
      setShowHint(false);

      return;
    }

    const timeoutId = setTimeout(() => {
      setShowHint(true);
    }, WAITING_HINT_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isWaiting]);

  if (!isWaiting || !showHint) {
    return null;
  }

  return (
    <Banner
      hasBg
      multiline
      variant="warn"
      message={t(
        'submit.pending.externalDeposit.stillWaiting',
        "We're still waiting for your transfer. If you've already sent funds, make sure you sent the asset you selected above.",
      )}
    />
  );
};
