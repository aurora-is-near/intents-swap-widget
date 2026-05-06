import { useId } from 'react';

export const AsterIcon = () => {
  // The linear gradients in the SVG need unique IDs to prevent conflicts when
  // multiple icons are rendered on the same page, which can prevent the
  // gradient from rendering correctly.
  const aId = useId();
  const bId = useId();
  const cId = useId();
  const dId = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      fill="none"
      viewBox="0 0 19 18">
      <path
        fill={`url(#${aId})`}
        d="m6.082 17.122 .42-1.942a3.476 3.476 0 0 0-3.397-4.212H1.18a9.02 9.02 0 0 0 4.902 6.154"
      />
      <path
        fill={`url(#${bId})`}
        d="M6.927 17.475c.949.34 1.971.525 3.037.525 4.294 0 7.886-3.008 8.784-7.032h-5.875a5.625 5.625 0 0 0-5.498 4.435z"
      />
      <path
        fill={`url(#${cId})`}
        d="M18.9 10.068q.064-.525.064-1.069a9 9 0 0 0-8.26-8.97L9.441 5.855a3.476 3.476 0 0 0 3.398 4.212z"
      />
      <path
        fill={`url(#${dId})`}
        d="M9.789 0a9 9 0 0 0-8.763 10.068h2.046a5.625 5.625 0 0 0 5.497-4.435z"
      />
      <defs>
        <linearGradient
          id={aId}
          x1="11.58"
          x2="8.024"
          y1="0"
          y2="18.024"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#efbe84" />
          <stop offset="1" stopColor="#eaae67" />
        </linearGradient>
        <linearGradient
          id={bId}
          x1="11.58"
          x2="8.024"
          y1="0"
          y2="18.024"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#efbe84" />
          <stop offset="1" stopColor="#eaae67" />
        </linearGradient>
        <linearGradient
          id={cId}
          x1="11.58"
          x2="8.024"
          y1="0"
          y2="18.024"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#efbe84" />
          <stop offset="1" stopColor="#eaae67" />
        </linearGradient>
        <linearGradient
          id={dId}
          x1="11.58"
          x2="8.024"
          y1="0"
          y2="18.024"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#efbe84" />
          <stop offset="1" stopColor="#eaae67" />
        </linearGradient>
      </defs>
    </svg>
  );
};
