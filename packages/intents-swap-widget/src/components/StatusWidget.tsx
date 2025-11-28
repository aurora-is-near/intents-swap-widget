import * as Icons from 'lucide-react';

const Error = ({ message }: { message: string }) => (
  <div className="flex flex-col gap-sw-lg py-sw-6xl items-center justify-center">
    <Icons.CircleX size={36} strokeWidth={1.5} className="text-alert-100" />
    <span className="text-sw-label-m text-alert-100">{message}</span>
  </div>
);

const Success = () => (
  <div className="flex flex-col gap-sw-lg py-sw-6xl items-center justify-center">
    <Icons.CheckCircle2
      size={36}
      strokeWidth={1.5}
      className="text-success-100"
    />
    <span className="text-sw-label-m text-success-100 text-center">
      Transaction detected
    </span>
  </div>
);

export const StatusWidget = {
  Error,
  Success,
};
