type Props = {
  message?: string;
};

export const ApiKeysEmpty = ({ message = 'No API keys yet' }: Props) => (
  <div className="flex flex-col gap-csw-2xl mt-csw-2xl">
    <div className="flex items-center justify-center rounded-csw-md w-full h-[20dvh] bg-csw-gray-900">
      <p className="text-csw-body-md text-csw-gray-400 text-center">
        {message}
      </p>
    </div>
  </div>
);
