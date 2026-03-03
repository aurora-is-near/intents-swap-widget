import { CloseW700 as Close } from '@material-symbols-svg/react-rounded/icons/close';
import { GraphicEqFillW700 as GraphicEqFill } from '@material-symbols-svg/react-rounded/icons/graphic-eq';

import { useTypedTranslation } from '@/localisation';

const Error = ({ message }: { message: string }) => {
  const { t } = useTypedTranslation();

  return (
    <div className="flex flex-col gap-sw-xl py-sw-6xl items-center justify-center bg-sw-gray-800 rounded-sw-lg mb-sw-md">
      <div className="flex items-center justify-center bg-sw-status-error rounded-sw-md p-sw-lg">
        <Close size={24} className="text-sw-gray-950" />
      </div>
      <div className="flex flex-col gap-sw-sm items-center justify-center">
        <span className="text-sw-label-md text-sw-gray-50 text-center">
          {t('deposit.external.transactionDetected.error', 'Unexpected error')}
        </span>
        <span className="text-sw-label-sm text-sw-gray-200 text-center">
          {message}
        </span>
      </div>
    </div>
  );
};

const Success = () => {
  const { t } = useTypedTranslation();

  return (
    <div className="flex flex-col gap-sw-xl py-sw-6xl items-center justify-center bg-sw-gray-800 rounded-sw-lg mb-sw-md">
      <div className="flex items-center justify-center bg-sw-status-success rounded-sw-md p-sw-lg">
        <GraphicEqFill size={24} className="text-sw-gray-950" />
      </div>
      <div className="flex flex-col gap-sw-sm items-center justify-center">
        <span className="text-sw-label-md text-sw-gray-50 text-center">
          {t(
            'deposit.external.transactionDetected.title',
            'Transaction detected',
          )}
        </span>
        <span className="text-sw-label-sm text-sw-gray-200 text-center">
          {t(
            'deposit.external.transactionDetected.description',
            'It might take a few minutes to process your deposit.',
          )}
        </span>
      </div>
    </div>
  );
};

export const StatusWidget = {
  Error,
  Success,
};
