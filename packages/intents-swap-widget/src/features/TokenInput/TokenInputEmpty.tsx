import { Card } from '@/components/Card';
import { useTypedTranslation } from '@/localisation';

import { useConfig } from '../../config';
import { TokenInputHeading } from './TokenInputHeading';

type Msg = { type: 'on_click_select_token' };

type Props = {
  onMsg: (msg: Msg) => void;
  heading: string;
};

export const TokenInputEmpty = ({ onMsg, heading }: Props) => {
  const { hideTokenInputHeadings } = useConfig();
  const { t } = useTypedTranslation();

  return (
    <Card
      isClickable
      aria-label={heading}
      className="flex flex-col px-sw-2xl py-sw-xl"
      onClick={() => onMsg({ type: 'on_click_select_token' })}>
      {!hideTokenInputHeadings && (
        <div className="mb-sw-md">
          <TokenInputHeading>{heading}</TokenInputHeading>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span
          className="h-[36px] font-medium text-sw-gray-200"
          style={{ fontSize: '32px' }}>
          0
        </span>
        <div className="flex items-center justify-center h-[36px]">
          <button
            type="button"
            onClick={() => onMsg({ type: 'on_click_select_token' })}
            className="gap-sw-md px-sw-md flex h-[40px] shrink-0 cursor-pointer items-center rounded-sw-md bg-sw-gray-800">
            <span className="text-sw-label-md text-sw-gray-50">
              {t('tokens.input.selectToken.label', 'Select token')}
            </span>
          </button>
        </div>
      </div>
      <div className="h-sw-2xl w-full mt-sw-md" />
    </Card>
  );
};
