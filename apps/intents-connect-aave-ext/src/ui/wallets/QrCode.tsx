import { useCallback, useLayoutEffect, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';

/** SVG units per module: whole numbers, so modules tile without gaps. */
const UNITS_PER_MODULE = 16;

/** The button's mark, white on black, for the middle of the code. */
const LOGO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#000"/><path d="M12 5 5.5 18h2.8L12 10.6 15.7 18h2.8L12 5Z" fill="#fff"/></svg>',
)}`;

/**
 * One module-level instance owns one DOM node, so exactly one of these may be
 * mounted at a time: `append` moves the rendered element to the latest
 * container. Ported from the wallet extension's QR code, in black and white.
 */
const qrCode = new QRCodeStyling({
  image: LOGO,
  type: 'svg',
  // H + a small logo: the centre image must not wipe data modules.
  qrOptions: { errorCorrectionLevel: 'H' },
  dotsOptions: { color: '#000000', type: 'extra-rounded' },
  backgroundOptions: { color: '#ffffff' },
  cornersSquareOptions: { type: 'dot' },
  cornersDotOptions: { type: 'dot' },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.25,
    margin: UNITS_PER_MODULE,
  },
});

/**
 * Drawn at exactly `modules × 16` units and shown at a whole number of CSS
 * px per module, so anti-aliasing draws no seams through merged modules.
 */
export const QrCode = ({
  value,
  size = 232,
}: {
  value: string;
  /** Target width and height, in CSS px. */
  size?: number;
}) => {
  const [modules, setModules] = useState(0);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      qrCode.append(node);
    }
  }, []);

  useLayoutEffect(() => {
    qrCode.update({ data: value });

    const count = qrCode._qr?.getModuleCount() ?? 0;
    const units = count * UNITS_PER_MODULE;

    qrCode.update({ width: units, height: units });
    setModules(count);
  }, [value]);

  const side = modules
    ? Math.max(2, Math.round(size / modules)) * modules
    : size;

  return (
    // White in every theme: a QR code scans as dark on light.
    <div className="mx-auto w-fit rounded-card bg-white p-3 shadow-box">
      <div
        ref={containerRef}
        style={{ width: side, height: side }}
        className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      />
    </div>
  );
};
