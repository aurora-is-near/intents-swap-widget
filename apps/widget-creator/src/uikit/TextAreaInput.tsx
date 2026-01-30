import { clsx } from 'clsx';

type Props = {
  value?: string;
  placeholder?: string;
  state?: 'normal' | 'error';
  onChange: (value: string) => void;
};

export const FeeJsonInput = ({
  value = '',
  state = 'normal',
  placeholder,
  onChange,
}: Props) => (
  <div className="flex-shrink-0">
    <div
      className={clsx('relative overflow-hidden rounded-csw-md', {
        'bg-csw-gray-800': state === 'normal',
        'bg-csw-status-error/20': state === 'error',
      })}>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        rows={6}
        className={clsx(
          'w-[99%] min-h-[200px] bg-transparent outline-none resize-y font-mono text-sm leading-[1.5em] p-csw-lg',
          {
            'text-csw-gray-50 placeholder-csw-gray-300': state === 'normal',
            'text-csw-status-error placeholder-csw-status-error':
              state === 'error',
          },
        )}
      />
    </div>
  </div>
);
