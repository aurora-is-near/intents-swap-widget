/**
 * The Aurora Intents word mark, copied from Web-Borrow-NotConnected.dc.html
 * line 185. The letters follow `--ink` (the artboard's `.lg-s`/`.lg-f`); the
 * lime triangle is the mark's own colour, which has no token. 200×20, and
 * 150px wide at ≤640px (line 106).
 */
export function Logo() {
  return (
    <svg
      aria-label="Aurora Intents"
      className="block mobile:h-auto mobile:w-[150px]"
      height="20"
      role="img"
      viewBox="0 0 300 30"
      width="200">
      <path
        d="M13 6L5 22H21Z"
        fill="#CEEC98"
        stroke="#CEEC98"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <g
        className="stroke-ink"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.2">
        <path d="M2 22L10 2L18 22" transform="translate(38 4)" />
        <path d="M2 2V13A8 8 0 0 0 18 13V2" transform="translate(64 4)" />
        <path
          d="M2 22V2H10A6 6 0 0 1 10 14H2M10 14L18 22"
          transform="translate(90 4)"
        />
        <ellipse cx="126" cy="15" rx="9.3" ry="10.4" />
        <path
          d="M2 22V2H10A6 6 0 0 1 10 14H2M10 14L18 22"
          transform="translate(142 4)"
        />
        <path d="M2 22L10 2L18 22" transform="translate(168 4)" />
      </g>
      <text
        className="fill-ink"
        fontFamily="'Schibsted Grotesk',system-ui,sans-serif"
        fontSize="25"
        fontWeight="800"
        letterSpacing="-0.5"
        x="204"
        y="25">
        Intents
      </text>
    </svg>
  );
}
