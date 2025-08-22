import { Card } from '@/components/Card';

type Msg = { type: 'on_click_select_token' };

type Props = {
  onMsg: (msg: Msg) => void;
};

export const TokenInputEmpty = ({ onMsg }: Props) => (
  <Card
    isClickable
    className="gap-sw-2xl flex flex-col"
    onClick={() => onMsg({ type: 'on_click_select_token' })}>
    <div className="flex items-center justify-between">
      <span
        className="font-medium text-sw-gray-200"
        style={{ fontSize: '32px' }}>
        0
      </span>
      <button
        type="button"
        onClick={() => onMsg({ type: 'on_click_select_token' })}
        className="gap-sw-md px-sw-md flex h-[36px] min-w-[100px] shrink-0 cursor-pointer items-center rounded-sw-md bg-sw-gray-600">
        <span className="text-sw-label-m text-sw-gray-50">Select token</span>
      </button>
    </div>
    <div className="h-sw-2xl w-full" />
  </Card>
);
