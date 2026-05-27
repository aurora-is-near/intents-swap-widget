import { GppBadFillW700 as GppBadFill } from '@material-symbols-svg/react-rounded/icons/gpp-bad';

import { useConfig } from '@/config';
import { CHAINS_LIST } from '@/constants/chains';
import { useTypedTranslation } from '@/localisation';
import { useHandleKeyDown } from '@/hooks';
import { useSwitchChain } from '@/hooks/useSwitchChain';
import { useUnsupportedChain } from '@/hooks/useUnsupportedChain';
import { Button, Card, CloseButton } from '@/components';

export const ChainNotSupportedModal = () => {
  const { t } = useTypedTranslation();
  const { providers } = useConfig();
  const { unsupportedChain, clearUnsupportedChain } = useUnsupportedChain();
  const { switchChain, isSwitchingChain } = useSwitchChain({ providers });

  useHandleKeyDown('Escape', clearUnsupportedChain);

  if (!unsupportedChain) {
    return null;
  }

  const chainLabel = CHAINS_LIST[unsupportedChain].label;

  return (
    <Card className="relative w-full gap-sw-2xl flex flex-col">
      <CloseButton
        onClick={clearUnsupportedChain}
        className="absolute top-sw-2xl right-sw-2xl"
      />
      <GppBadFill size={48} className="text-sw-status-error" />

      <header className="flex flex-col gap-sw-lg">
        <h1 className="text-sw-label-lg text-sw-gray-50">
          {t('submit.error.chainNotSupported.title', {
            defaultValue: "Your wallet doesn't support {{chain}}",
            chain: chainLabel,
          })}
        </h1>
        <p className="text-sw-body-md text-sw-gray-200">
          {t('submit.error.chainNotSupported.description', {
            defaultValue:
              'Add the {{chain}} network to your wallet, or switch to a different wallet, then try again.',
            chain: chainLabel,
          })}
        </p>
      </header>

      <div className="flex flex-col gap-sw-xl mt-sw-lg">
        <Button
          size="lg"
          variant="primary"
          state={isSwitchingChain ? 'loading' : 'default'}
          onClick={() => switchChain()}>
          {t('submit.error.chainNotSupported.tryAgain', 'Try again')}
        </Button>
        <Button size="lg" variant="outlined" onClick={clearUnsupportedChain}>
          {t('submit.error.chainNotSupported.dismiss', 'Dismiss')}
        </Button>
      </div>
    </Card>
  );
};
