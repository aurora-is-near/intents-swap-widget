import { CreateApiKey } from './CreateApiKey';

type Props = {
  isCreatingKey: boolean;
  onClickCreate: () => void;
};

export const ApiKeysEmpty = ({ isCreatingKey, onClickCreate }: Props) => (
  <>
    <div className="flex flex-col gap-csw-2xl mt-csw-2xl">
      <div className="flex items-center justify-center rounded-csw-md w-full h-[20dvh] bg-csw-gray-900">
        <p className="text-csw-body-md text-csw-gray-400 text-center">
          No API keys yet
        </p>
      </div>
    </div>

    <CreateApiKey isLoading={isCreatingKey} onClick={onClickCreate} />
  </>
);
