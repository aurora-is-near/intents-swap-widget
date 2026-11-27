/**
 * The X logo, 18×18 (Web-Borrow-NotConnected.dc.html lines 190, 1033). Its
 * colour comes from `className`: `fill-ink` in the header, the footer's
 * fixed light ink there.
 */
export function XIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path
        className={className}
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}
