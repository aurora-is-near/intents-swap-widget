import { clsx } from 'clsx';

type Props = {
  customFee: string;
  isValueBasedFee: boolean;
};

export const FeesSummary = ({ customFee, isValueBasedFee }: Props) => (
  <div className="flex flex-col gap-csw-lg bg-csw-gray-900 rounded-csw-lg p-csw-2xl w-full">
    <header className="flex items-center justify-between w-full border-b border-csw-gray-800 pb-csw-xl">
      <span className="text-csw-label-md text-csw-gray-50">End user pays</span>
      <span className="text-csw-label-sm text-csw-gray-950 px-csw-sm py-csw-xs rounded-full bg-csw-gray-50">
        {isValueBasedFee
          ? 'Applied to all trades'
          : 'Some assets have custom fees'}
      </span>
    </header>

    <ul className="flex flex-col gap-csw-lg">
      <li className="flex items-center justify-between gap-csw-lg text-csw-label-md">
        <span className="text-csw-gray-200">Your custom default fee</span>
        <span
          className={clsx(
            'text-csw-accent-400',
            customFee && 'text-csw-gray-50',
          )}>
          {customFee ? `${customFee.replaceAll('%', '')}%` : 'Invalid config'}
        </span>
      </li>
    </ul>
  </div>
);
