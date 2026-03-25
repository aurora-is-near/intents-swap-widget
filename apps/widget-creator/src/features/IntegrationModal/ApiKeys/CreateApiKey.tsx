import { AddW700 as Add } from '@material-symbols-svg/react-rounded/icons/add';

import { Button } from '@/uikit/Button';

type Props = {
  label?: string;
  isLoading: boolean;
  onClick: () => void;
};

export const CreateApiKey = ({
  label = 'Create API key',
  isLoading,
  onClick,
}: Props) => (
  <div className="py-csw-2xl mt-csw-2xl border-t border-csw-gray-900">
    <Button
      fluid
      size="sm"
      variant="primary"
      detail="accent"
      state={isLoading ? 'loading' : 'default'}
      className="w-full"
      icon={Add}
      onClick={onClick}>
      {label}
    </Button>
  </div>
);
