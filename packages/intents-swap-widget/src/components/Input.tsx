import { Fragment, useEffect, useRef, useState } from 'react';
import { Input as UIInput } from '@headlessui/react';
import type { InputProps } from '@headlessui/react';
import type { PropsWithChildren } from 'react';
import type { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';

type State = 'default' | 'disabled' | 'error' | 'fixed';

export type Props = Omit<InputProps, 'size'> & {
  icon?: LucideIcon;
  defaultValue?: string;
  focusOnMount?: boolean;
  state?: State;
};

export const Input = ({
  state = 'default',
  defaultValue = '',
  focusOnMount = false,
  className,
  onChange,
  children,
  icon: Icon,
  ...inputProps
}: PropsWithChildren<Props>) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState(defaultValue);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);
  const handleClear = () => {
    setValue('');
    onChange?.({
      target: { value: '' },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange?.(e);
  };

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (focusOnMount) {
      inputRef.current?.focus();
    }
  }, []);

  const inputDisabled = ['disabled', 'fixed'].includes(state);

  return (
    <UIInput
      type="text"
      as={Fragment}
      disabled={inputDisabled}
      autoComplete="off"
      className={cn(
        'px-sw-lg py-sw-lg text-sw-label-m rounded-sw-md ring-transparent ring-1 ring-inset data-focus:outline-none transition-colors',
        {
          'bg-sw-gray-600 text-sw-gray-50 hover:bg-sw-gray-500':
            state === 'default',
        },
        { 'ring-sw-gray-400': isFocused && state === 'default' },
        {
          'cursor-not-allowed bg-sw-gray-800 text-sw-gray-100':
            state === 'disabled',
        },
        {
          'bg-sw-gray-800 text-sw-gray-100': state === 'fixed',
        },
        { 'text-sw-alert-100 bg-sw-gray-600': state === 'error' },
        className,
      )}
      {...inputProps}>
      {() => (
        <div className="flex items-center justify-between">
          {Icon && <Icon size={16} className="mr-sw-md text-sw-gray-100" />}
          <input
            value={value}
            ref={inputRef}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onChange={onInputChange}
            disabled={inputDisabled}
            placeholder={inputProps.placeholder}
            autoComplete="off"
            className={cn('text-sw-label-m mr-auto w-full outline-none', {
              'cursor-not-allowed': state === 'disabled',
            })}
          />
          {!inputDisabled && (
            <div className="gap-sw-md relative flex items-center">
              {children}
              {value ? (
                <button
                  type="button"
                  className={cn(
                    'cursor-default text-sw-gray-100 opacity-0 transition-opacity duration-150 ease-in-out hover:text-sw-gray-50',
                    {
                      'cursor-pointer opacity-100': !!value,
                    },
                  )}
                  onClick={handleClear}>
                  <Icons.X className="h-sw-xl w-sw-xl" />
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </UIInput>
  );
};
