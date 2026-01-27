import { useLogin, useLogout, usePrivy } from '@privy-io/react-auth';

import { OutlinedButton } from '../../uikit/Button';

export function AuthButton() {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  if (!ready) {
    return (
      <OutlinedButton size="sm" fluid state="loading">
        <span className="text-sm font-medium leading-4 text-csw-gray-50">
          Loading...
        </span>
      </OutlinedButton>
    );
  }

  if (authenticated && user) {
    return (
      <div className="flex items-center gap-csw-md">
        <span className="text-sm font-medium leading-4 text-csw-gray-50">
          {user.email?.address}
        </span>
        <OutlinedButton size="sm" fluid onClick={logout} state="default">
          <span className="text-sm font-medium leading-4 text-csw-gray-50">
            Logout
          </span>
        </OutlinedButton>
      </div>
    );
  }

  return (
    <OutlinedButton size="sm" fluid onClick={login}>
      <span className="text-sm font-medium leading-4 text-csw-gray-50">
        Login
      </span>
    </OutlinedButton>
  );
}
