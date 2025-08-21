import * as Icons from 'lucide-react';

import { Button } from './Button';
import { Card } from './Card';

type Props = {
  message: string;
  onClickRetry: () => void;
};

export const BlockingError = ({ message, onClickRetry }: Props) => (
  <Card>
    <div className="gap-ds-2xl py-6xl flex min-h-[200px] flex-col items-center justify-center">
      <div className="gap-ds-md flex flex-col items-center justify-center">
        <header className="gap-ds-md flex items-center">
          <Icons.X strokeWidth={2.5} className="text-mauve-50 h-7 w-7" />
          <h3 className="text-h4 text-mauve-50">Ooops...</h3>
        </header>
        <p className="text-p-s text-center text-gray-300">
          {message} <br /> Please try again or contact support.
        </p>
      </div>
      <Button
        size="md"
        variant="primary"
        icon={Icons.RefreshCcw}
        onClick={onClickRetry}
        className="w-fit">
        Try again
      </Button>
    </div>
  </Card>
);
