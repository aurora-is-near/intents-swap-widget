import { CloseW700 as Close } from '@material-symbols-svg/react-rounded/icons/close';
import { CheckCircleFillW700 as CheckCircleFill } from '@material-symbols-svg/react-rounded/icons/check-circle';

const Error = ({ message }: { message: string }) => (
  <div className="flex flex-col gap-sw-lg py-sw-6xl items-center justify-center">
    <Close size={36} className="text-sw-status-error" />
    <span className="text-sw-label-sm text-sw-status-error">{message}</span>
  </div>
);

const Success = () => (
  <div className="flex flex-col gap-sw-lg py-sw-6xl items-center justify-center">
    <CheckCircleFill size={36} className="text-sw-status-success" />
    <span className="text-sw-label-sm text-sw-status-success text-center">
      Transaction detected
    </span>
  </div>
);

export const StatusWidget = {
  Error,
  Success,
};
