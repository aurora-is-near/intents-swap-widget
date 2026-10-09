import type { ReactNode } from 'react';

import { Button } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon } from './Icon';
import { Screen } from './Screen';

type Point = {
  /** `keep`: stays as it is; `lose`: goes away with it. */
  kind: 'keep' | 'lose';
  text: string;
};

type Props = {
  /** Header: what is removed, e.g. "Remove account". */
  title: string;
  /** The account or wallet, by name. */
  name: string;
  /** Its icon, ~64px. */
  icon: ReactNode;
  /** What removing means, in one or two sentences. */
  warning: string;
  /** What stays and what goes, as a short list. */
  points: Point[];
  variant: 'warn' | 'error';
  confirmLabel: string;
  onKeep: () => void;
  onRemove: () => void | Promise<void>;
};

/** A removal confirmation, centred; keeping is the prominent choice. */
export const ConfirmRemoveView = ({
  title,
  name,
  icon,
  warning,
  points,
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
    <div className="my-auto flex flex-col items-center gap-sw-2xl px-sw-md py-sw-2xl text-center">
      <div className="relative">
        {icon}
        <span
          className={cn(
            'absolute -bottom-[6px] -right-[6px] flex h-[28px] w-[28px] items-center justify-center rounded-full text-sw-gray-950 shadow-[0_0_0_3px_var(--c-sw-gray-950)]',
            variant === 'error' ? 'bg-sw-status-error' : 'bg-sw-status-warning',
          )}>
          <Icon name="close" size={16} strokeWidth={2.5} />
        </span>
      </div>

      <div className="flex flex-col items-center gap-sw-md">
        <h2 className="m-0 text-sw-h5 text-sw-gray-50">Remove {name}?</h2>
        <p className="m-0 max-w-[300px] text-sw-body-md text-sw-gray-200">
          {warning}
        </p>
      </div>

      <ul className="m-0 flex w-full flex-col gap-sw-md rounded-sw-lg bg-sw-gray-900 p-sw-xl text-left">
        {points.map((point) => (
          <li
            key={point.text}
            className="flex list-none items-start gap-sw-md text-sw-label-sm text-sw-gray-100">
            <span
              className={cn(
                'mt-[-1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-sw-gray-950',
                point.kind === 'keep'
                  ? 'bg-sw-status-success'
                  : 'bg-sw-status-error',
              )}>
              <Icon
                name={point.kind === 'keep' ? 'check' : 'close'}
                size={12}
              />
            </span>
            {point.text}
          </li>
        ))}
      </ul>
    </div>
  </Screen>
);
