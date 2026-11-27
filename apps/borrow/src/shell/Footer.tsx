import type { ReactNode } from 'react';

import { Logo } from './Logo';
import { XIcon } from './XIcon';

/**
 * A `.soc` social link (Web-Borrow-NotConnected.dc.html lines 89–91): 40×40,
 * radius 12, 1px `#3A4046` border, `accent` on hover and as the focus ring.
 */
function SocialLink({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      aria-label={label}
      className="box-border inline-flex h-10 w-10 items-center justify-center rounded-12 border border-solid border-footer-soc-bd hover:border-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid"
      href="#">
      {children}
    </a>
  );
}

/**
 * A `.flink` (lines 87–88, 91): 15px `#C9CEC8`, `#FFFFFD` on hover, the
 * `accent` focus ring.
 */
function FooterLink({ children }: { children: string }) {
  return (
    <a
      className="block text-15 text-footer-link no-underline hover:text-footer-link-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid"
      href="#">
      {children}
    </a>
  );
}

/** A link column (line 1036): a 13px / 700 heading, the links 12px apart. */
function LinkColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="flex min-w-30 flex-col gap-3">
      <h2 className="m-0 mb-1 text-13 font-bold text-footer-mut2">{title}</h2>
      {links.map((link) => (
        <FooterLink key={link}>{link}</FooterLink>
      ))}
    </div>
  );
}

/**
 * The footer, Web-Borrow-NotConnected.dc.html lines 1028–1043: logo,
 * tagline and social links beside the Product and Developers columns, then
 * the copyright with Privacy · Terms. The links have no URLs yet.
 *
 * Dark in both themes: band #141619 with a #2A2E33 top border, text #E8EBE6,
 * margin-top 48, padding 48px 0 26px. Its inner `.wrap` has no bottom
 * padding: 0 24px, and 0 16px at ≤640px (line 108). None of these colours
 * has a kit token, since the band does not follow the theme.
 */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-solid border-t-footer-bd bg-footer pt-12 pb-6.5 text-footer-ink">
      <div className="mx-auto box-border max-w-300 px-6 mobile:px-4">
        <div className="flex flex-wrap justify-between gap-9">
          <div className="max-w-85">
            <Logo tone="light" />
            <p className="mt-3.5 mb-0 text-15/normal text-footer-mut">
              Borrow, swap and earn on any chain from one signature.
            </p>
            <div className="mt-5 flex gap-2.5">
              <SocialLink label="X">
                <XIcon className="fill-footer-ink" />
              </SocialLink>
              <SocialLink label="YouTube">
                <svg
                  aria-hidden="true"
                  height="20"
                  viewBox="0 0 24 24"
                  width="20">
                  <rect
                    className="stroke-footer-ink"
                    fill="none"
                    height="14"
                    rx="4"
                    strokeWidth="1.8"
                    width="20"
                    x="2"
                    y="5"
                  />
                  <path className="fill-footer-ink" d="M10 9l5 3-5 3z" />
                </svg>
              </SocialLink>
              <SocialLink label="Telegram">
                <svg
                  aria-hidden="true"
                  height="20"
                  viewBox="0 0 24 24"
                  width="20">
                  <path
                    className="stroke-footer-ink"
                    d="M21 4L3 11l6 2 2 6 3-4 5 4z"
                    fill="none"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </SocialLink>
            </div>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-16">
            <LinkColumn links={['Swap', 'Borrow', 'Earn']} title="Product" />
            <LinkColumn
              links={['Documentation', 'Borrow API', 'Status']}
              title="Developers"
            />
          </nav>
        </div>
        <div className="mt-8.5 flex flex-wrap justify-between gap-2 border-t border-solid border-t-footer-bd pt-4.5 text-13 text-footer-mut2">
          <small className="text-13">
            © 2026 Aurora. All rights reserved.
          </small>
          <span>
            <a
              className="text-inherit no-underline hover:text-footer-link-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid"
              href="#">
              Privacy
            </a>
            {' · '}
            <a
              className="text-inherit no-underline hover:text-footer-link-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:outline-solid"
              href="#">
              Terms
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
