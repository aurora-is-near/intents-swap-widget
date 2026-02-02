import { useState } from 'react';
import { CheckW700 as Check } from '@material-symbols-svg/react-rounded/icons/check';
import { DeleteW700 as Delete } from '@material-symbols-svg/react-rounded/icons/delete';
import { EditSquareW700 as Edit } from '@material-symbols-svg/react-rounded/icons/edit-square';
import { ContentCopyW700 as Copy } from '@material-symbols-svg/react-rounded/icons/content-copy';

import { getPercentFromBasisPoints, getSimpleValueBasedFee } from '../utils';

import { Button } from '@/uikit/Button';
import { useDeleteApiKey } from '@/api/hooks';
import type { ApiKey } from '@/api/types';

type Props = {
  apiKey: ApiKey;
  onClickFees: (apiKey: ApiKey) => void;
};

const maskApiKey = (key: string) => {
  const firstChars = key.slice(0, 3);
  const lastChars = key.slice(-4);
  const dots = '•'.repeat(20);

  return `${firstChars}${dots}${lastChars}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const ApiKeyCard = ({ apiKey, onClickFees }: Props) => {
  const [isCopied, setIsCopied] = useState(false);

  const { mutate: deleteApiKey, status: deleteApiKeyStatus } = useDeleteApiKey(
    apiKey.widgetAppKey,
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey.widgetAppKey);
    setTimeout(() => setIsCopied(false), 2000);
    setIsCopied(true);
  };

  const valueBasedFee = getSimpleValueBasedFee(apiKey.feeRules);

  return (
    <div className="relative flex flex-col gap-csw-xl bg-csw-gray-900 rounded-csw-lg px-csw-2xl py-csw-xl overflow-hidden">
      {deleteApiKeyStatus === 'pending' && (
        <div className="absolute top-0 right-0 size-full bg-csw-gray-900/80 rounded-csw-lg animate-pulse" />
      )}

      <header className="flex items-center justify-between w-full">
        <span className="text-csw-label-md text-csw-gray-50">API key</span>
        <span className="text-csw-label-md text-csw-gray-300 mr-auto ml-csw-xs">
          created at {formatDate(apiKey.createdAt)}
        </span>
        <button
          className="cursor-pointer p-csw-2md"
          onClick={() => deleteApiKey()}>
          <Delete
            size={16}
            className="text-csw-gray-300 hover:text-csw-status-error transition-all"
          />
        </button>
      </header>

      <div className="flex items-center justify-between w-full p-csw-2md rounded-csw-md bg-csw-gray-800">
        <span className="text-csw-label-md text-csw-gray-50">
          {maskApiKey(apiKey.widgetAppKey)}
        </span>
        <button className="cursor-pointer" onClick={handleCopy}>
          {isCopied ? (
            <div className="flex items-center gap-csw-xs">
              <Check size={16} className="text-csw-status-success" />
              <span className="text-csw-label-md text-csw-status-success">
                Copied
              </span>
            </div>
          ) : (
            <Copy
              size={16}
              className="text-csw-gray-300 hover:text-csw-gray-200 transition-all"
            />
          )}
        </button>
      </div>

      <footer className="flex items-center justify-between w-full">
        <span className="text-csw-label-md text-csw-accent-200">
          {`${getPercentFromBasisPoints(valueBasedFee?.bps ?? 0)}%`}
        </span>
        <span className="text-csw-label-md text-csw-gray-300 mr-auto ml-csw-xs">
          custom fee
        </span>
        <Button
          size="sm"
          variant="outlined"
          className="w-fit"
          icon={Edit}
          onClick={() => onClickFees(apiKey)}>
          Edit fees
        </Button>
      </footer>
    </div>
  );
};
