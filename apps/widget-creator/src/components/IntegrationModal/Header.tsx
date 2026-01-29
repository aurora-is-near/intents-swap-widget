import { EmergencyFillW700 as Emergency } from '@material-symbols-svg/react-rounded/icons/emergency';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  description: ReactNode;
  warning?: ReactNode;
};

export const Header = ({ title, description, warning }: Props) => {
  return (
    <div className="flex flex-col gap-csw-lg flex-1 pt-csw-md sm:max-w-[80%] max-w-full">
      <h2 className="text-csw-label-lg text-csw-gray-50">{title}</h2>
      <p className="text-csw-body-md text-csw-gray-200">{description}</p>

      {!!warning && (
        <div className="flex items-center gap-csw-xxs">
          <Emergency size={16} className="text-csw-status-warning mr-csw-xs" />
          <p className="text-csw-body-sm text-csw-status-warning inline">
            {warning}
          </p>
        </div>
      )}
    </div>
  );
};
