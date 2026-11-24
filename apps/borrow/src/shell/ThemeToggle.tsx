import { Button, useTheme } from '@aurora-is-near/ui-kit';

/** Sun, shown in the dark theme (Web-Borrow-NotConnected.dc.html line 192). */
function SunIcon() {
  return (
    <svg aria-hidden="true" height="19" viewBox="0 0 24 24" width="19">
      <circle
        className="stroke-ink"
        cx="12"
        cy="12"
        fill="none"
        r="4.2"
        strokeWidth="2"
      />
      <path
        className="stroke-ink"
        d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Moon, shown in the light theme (same line). */
function MoonIcon() {
  return (
    <svg aria-hidden="true" height="19" viewBox="0 0 24 24" width="19">
      <path
        className="stroke-ink"
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"
        fill="none"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * The `.ibtn` theme switch (lines 53–54, 192): 40×40, radius 12, hover
 * `hov`. Its label names the theme it switches to.
 */
export function ThemeToggle() {
  const { theme, setPreference } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="h-[40px] w-[40px] p-0"
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      variant="ghost">
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
