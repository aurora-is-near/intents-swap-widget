import { Close } from '@material-symbols-svg/react-rounded/w700';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Input as UIInput } from '@headlessui/react';
import type { MaterialSymbolsComponent } from '@material-symbols-svg/react';
import type { InputProps } from '@headlessui/react';
import type { PropsWithChildren } from 'react';

import { cn } from '@/utils/cn';

type State = 'default' | 'disabled' | 'error' | 'fixed';

export type Props = Omit<InputProps, 'size'> & {
  icon?: MaterialSymbolsComponent;
  defaultValue?: string;
  focusOnMount?: boolean;
  fontSize?: 'sm' | 'md';
  state?: State;
};

export const Input = ({
  state = 'default',
  fontSize = 'md',
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
        'px-sw-lg py-sw-lg rounded-sw-md ring-transparent ring-1 ring-inset data-focus:outline-none transition-colors bg-sw-gray-800',
        {
          'text-sw-label-2sm': fontSize === 'sm',
          'text-sw-label-md': fontSize === 'md',
          'text-sw-gray-400 bg-sw-gray-800': state === 'fixed',
          'text-sw-status-error bg-sw-gray-800': state === 'error',
          'text-sw-gray-50 bg-sw-gray-700': isFocused && state === 'default',
          'text-sw-gray-50 hover:bg-sw-gray-700':
            !isFocused && state === 'default',
          'cursor-not-allowed bg-sw-gray-800 text-sw-gray-400':
            state === 'disabled',
        },
        className,
      )}
      {...inputProps}>
      {() => (
        <div className="flex items-center justify-between">
          {Icon && <Icon size={16} className="mr-sw-md text-sw-gray-200" />}
          <input
            value={value}
            ref={inputRef}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onChange={onInputChange}
            disabled={inputDisabled}
            placeholder={inputProps.placeholder}
            autoComplete="off"
            className={cn('mr-auto w-full outline-none', {
              'cursor-not-allowed': state === 'disabled',
              'text-sw-label-2sm': fontSize === 'sm',
              'text-sw-label-md': fontSize === 'md',
            })}
          />
          {!inputDisabled && (
            <div className="gap-sw-md relative flex items-center justify-end">
              {children}
              {value ? (
                <button
                  type="button"
                  className={cn(
                    'opacity-0 transition-opacity duration-150 ease-in-out hover:text-sw-gray-50 pl-sw-sm',
                    {
                      'cursor-pointer opacity-100': !!value,
                      'text-sw-gray-200': isFocused,
                      'text-sw-gray-300': !isFocused,
                    },
                  )}
                  onClick={handleClear}>
                  <Close className="h-sw-xl w-sw-xl" />
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </UIInput>
  );
};
