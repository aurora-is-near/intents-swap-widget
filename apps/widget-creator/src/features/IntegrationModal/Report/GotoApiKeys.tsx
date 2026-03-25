import { Button } from '@/uikit/Button';

type Props = {
  label?: string;
  onClick: () => void;
};

export const GotoApiKeys = ({ label = 'Go to API keys', onClick }: Props) => (
  <div className="py-csw-2xl mt-csw-2xl border-t border-csw-gray-900">
    <Button
      fluid
      size="sm"
      variant="outlined"
      className="w-full"
      onClick={onClick}>
      {label}
    </Button>
  </div>
);
