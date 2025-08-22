import { Fragment } from 'react';

import { Hr } from '@/components/Hr';
import { Card } from '@/components/Card';
import type { TransferResult } from '@/types/transfer';

import { fireEvent, moveTo } from '@/machine';

import { CheckIcon } from './CheckIcon';
import { CloseButton } from './CloseButton';
import { SummaryItem } from './SummaryItem';

type Msg = { type: 'on_dismiss_success' };

type Props = TransferResult & {
  message: string | string[];
  onMsg: (msg: Msg) => void;
};

export const SuccessScreen = ({
  intent,
  transactionLink,
  hash: txHash,
  message,
  onMsg,
}: Props) => {
  const lines = Array.isArray(message) ? message : [message];

  const onDismiss = () => {
    fireEvent('reset', null);
    moveTo('initial_dry');
    onMsg({ type: 'on_dismiss_success' });
  };

  return (
    <Card>
      <header className="flex justify-between">
        <CheckIcon />
        <CloseButton onClick={onDismiss} />
      </header>
      <span className="text-sw-label-l text-sw-gray-50">All done</span>
      <p className="mt-sw-sm text-sw-p-s text-sw-gray-100">
        {lines.map((line, idx) => (
          <Fragment key={idx}>
            {line}
            {idx !== lines.length - 1 && <br />}
          </Fragment>
        ))}
      </p>
      <Hr className="mt-sw-xl mb-sw-md" />
      <ul className="mt-sw-xl flex flex-col">
        <SummaryItem
          hasCopyAction
          value={txHash}
          externalUrl={transactionLink}
          label="Transaction hash"
        />
        {!!intent && (
          <SummaryItem hasCopyAction label="Intent" value={intent} />
        )}
      </ul>
    </Card>
  );
};
