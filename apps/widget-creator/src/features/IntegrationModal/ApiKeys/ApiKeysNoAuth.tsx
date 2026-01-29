import { useLogin } from '@privy-io/react-auth';

import { Button } from '@/uikit/Button';

export const ApiKeysNoAuth = () => {
  const { login } = useLogin();

  return (
    <>
      <div className="flex flex-col gap-csw-2xl mt-csw-2xl">
        <div className="flex items-center justify-center rounded-csw-md w-full h-[20dvh] bg-csw-gray-900">
          <p className="text-csw-body-md text-csw-gray-400 text-center">
            Log in to view
            <br />
            and create API keys
          </p>
        </div>
      </div>

      <div className="py-csw-2xl mt-csw-2xl border-t border-csw-gray-900">
        <Button
          fluid
          size="sm"
          variant="outlined"
          className="w-full"
          onClick={login}>
          Login
        </Button>
      </div>
    </>
  );
};
