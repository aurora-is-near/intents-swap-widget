import { Banner, Button } from '@aurora-is-near/intents-swap-widget';

import { Screen } from './Screen';

type Props = {
  title: string;
  /** What removing loses. */
  warning: string;
  variant: 'warn' | 'error';
  confirmLabel: string;
  onKeep: () => void;
  onRemove: () => void | Promise<void>;
};

/** A removal confirmation; keeping is the prominent choice. */
export const ConfirmRemoveView = ({
  title,
  warning,
  variant,
  confirmLabel,
  onKeep,
  onRemove,
}: Props) => (
  <Screen
    title={title}
    onBack={onKeep}
    footer={
      <>
        <Button variant="primary" size="lg" onClick={onKeep}>
          Keep it
        </Button>
        <Button variant="outlined" size="lg" onClick={onRemove}>
          {confirmLabel}
        </Button>
      </>
    }>
    <Banner variant={variant} message={warning} hasBg multiline />
  </Screen>
);
