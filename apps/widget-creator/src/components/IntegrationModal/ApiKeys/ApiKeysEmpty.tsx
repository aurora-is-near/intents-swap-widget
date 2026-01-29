import { AddW700 as Add } from '@material-symbols-svg/react-rounded/icons/add';

import { Button } from '@/uikit/Button';

export const ApiKeysEmpty = () => {
  return (
    <>
      <div className="flex flex-col gap-csw-2xl mt-csw-2xl">
        <div className="flex items-center justify-center rounded-csw-md w-full h-[20dvh] bg-csw-gray-900">
          <p className="text-csw-body-md text-csw-gray-400 text-center">
            No API keys yet
          </p>
        </div>
      </div>

      <div className="py-csw-2xl mt-csw-2xl border-t border-csw-gray-900">
        <Button
          fluid
          size="sm"
          variant="primary"
          detail="accent"
          className="w-full"
          icon={Add}
          onClick={() => {}}>
          Create API key
        </Button>
      </div>
    </>
  );
};
