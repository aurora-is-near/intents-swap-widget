import {
  CheckCircleFill,
  Close,
} from '@material-symbols-svg/react-rounded/w700';

const Error = ({ message }: { message: string }) => (
  <div className="flex flex-col gap-sw-lg py-sw-6xl items-center justify-center">
    <Close size={36} strokeWidth={1.5} className="text-sw-status-error" />
    <span className="text-sw-label-sm text-sw-status-error">{message}</span>
  </div>
);

const Success = () => (
  <div className="flex flex-col gap-sw-lg py-sw-6xl items-center justify-center">
    <CheckCircleFill
      size={36}
      strokeWidth={1.5}
      className="text-sw-status-success"
    />
    <span className="text-sw-label-sm text-sw-status-success text-center">
      Transaction detected
    </span>
  </div>
);

export const StatusWidget = {
  Error,
  Success,
};
