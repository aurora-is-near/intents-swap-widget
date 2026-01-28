import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthButton } from './AuthButton';

// Mock Privy hooks
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockUsePrivy = vi.fn();
const mockUseLogin = vi.fn(() => ({ login: mockLogin }));
const mockUseLogout = vi.fn(() => ({ logout: mockLogout }));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
  useLogin: () => mockUseLogin(),
  useLogout: () => mockUseLogout(),
}));

describe('AuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when not ready', () => {
    mockUsePrivy.mockReturnValue({
      ready: false,
      authenticated: false,
      user: undefined,
    });

    render(<AuthButton />);

    const loadingButton = screen.getByRole('button', { name: /loading/i });

    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();
  });

  it('renders login button when not authenticated', () => {
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
      user: undefined,
    });

    render(<AuthButton />);

    const loginButton = screen.getByRole('button', { name: /login/i });

    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toBeEnabled();
  });

  it('renders user email and logout button when authenticated', () => {
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      user: {
        email: {
          address: 'test@example.com',
        },
      },
    });

    render(<AuthButton />);

    const accountButton = screen.getByRole('button', { name: /account/i });

    expect(accountButton).toBeInTheDocument();
    expect(accountButton).toBeEnabled();
  });
});
