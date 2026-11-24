type LogoProps = {
  /**
   * `ink` follows the theme (the header's, Web-Borrow-NotConnected.dc.html
   * line 185); `light` is the footer's fixed #F5F6F4 on its dark band in
   * both themes (line 1031).
   */
  tone?: 'ink' | 'light';
};

/*
 * Per tone: size and the letters' colour. The header mark is 200×20, and
 * 150px wide at ≤640px (line 106); the footer mark is 220×22 at every width.
 * #F5F6F4 has no token: the footer is dark in both themes.
 */
const TONES = {
  ink: {
    width: 200,
    height: 20,
    svg: 'block mobile:h-auto mobile:w-[150px]',
    stroke: 'stroke-ink',
    fill: 'fill-ink',
  },
  light: {
    width: 220,
    height: 22,
    svg: 'block',
    stroke: 'stroke-[#F5F6F4]',
    fill: 'fill-[#F5F6F4]',
  },
} as const;

/**
 * The Aurora Intents word mark, copied from the artboard. The lime triangle
 * is the mark's own colour, which has no token.
 */
export function Logo({ tone = 'ink' }: LogoProps) {
  const { width, height, svg, stroke, fill } = TONES[tone];

  return (
    <svg
      aria-label="Aurora Intents"
      className={svg}
      height={height}
      role="img"
      viewBox="0 0 300 30"
      width={width}>
      <path
        d="M13 6L5 22H21Z"
        fill="#CEEC98"
        stroke="#CEEC98"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <g
        className={stroke}
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
        className={fill}
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
