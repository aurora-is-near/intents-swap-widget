import { useLogin, useLogout, usePrivy } from '@privy-io/react-auth';
import { HeaderButton } from '../HeaderButton';

export function AuthButton() {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  if (!ready) {
    return (
      <HeaderButton disabled variant="bright">
        Loading...
      </HeaderButton>
    );
  }

  if (authenticated && user) {
    return (
      <HeaderButton variant="bright" onClick={logout} >
        Logout
      </HeaderButton>
    );
  }

  return (
    <HeaderButton variant="bright" onClick={login}>
      Login
    </HeaderButton>
  );
}
