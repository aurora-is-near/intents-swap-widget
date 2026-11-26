import { Logo } from './Logo';

/**
 * The reduced footer (decided): logo, tagline and copyright only, from
 * Web-Borrow-NotConnected.dc.html lines 1028–1043. The artboard's link
 * columns, social icons and Privacy · Terms are placeholders without real
 * URLs, so they are left out.
 *
 * Dark in both themes: band #141619 with a #2A2E33 top border, text #E8EBE6,
 * margin-top 48, padding 48px 0 26px. Its inner `.wrap` has no bottom
 * padding: 0 24px, and 0 16px at ≤640px (line 108). Tagline 15px / 1.5
 * #9AA39B, 14px below the logo; the copyright row 13px #8A928C, 34px below,
 * padding-top 18 over a #2A2E33 rule. None of these colours has a token,
 * since the band does not follow the theme.
 */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-solid border-t-footer-bd bg-footer pt-12 pb-6.5 text-footer-ink">
      <div className="mx-auto box-border max-w-300 px-6 mobile:px-4">
        <div className="max-w-85">
          <Logo tone="light" />
          <p className="mt-3.5 mb-0 text-15/normal text-footer-mut">
            Borrow, swap and earn on any chain from one signature.
          </p>
        </div>
        <div className="mt-8.5 border-t border-solid border-t-footer-bd pt-4.5 text-13 text-footer-mut2">
          <small className="text-13">
            © 2026 Aurora. All rights reserved.
          </small>
        </div>
      </div>
    </footer>
  );
}
