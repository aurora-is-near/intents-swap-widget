import { useCallback, useLayoutEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';

/**
 * Canvas px per module: drawn at whole pixels, so merged modules have no
 * seams, then scaled as an image to one size for every code.
 */
const UNITS_PER_MODULE = 16;

/** The code's side, in CSS px, whatever its module count. */
const QR_SIZE = 232;
const QR_PADDING = 12;

/**
 * The white tile's side: what a code takes on screen, and what stands in
 * for one (loading, expired) so nothing moves.
 */
export const QR_TILE = QR_SIZE + 2 * QR_PADDING;

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
  type: 'canvas',
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
 * Drawn at `modules × 16` canvas px, shown at `QR_SIZE`: an EVM pairing
 * link and a TON one (more modules) take the same space.
 */
export const QrCode = ({
  value,
  label,
}: {
  value: string;
  /** What it is, for screen readers: a canvas says nothing itself. */
  label: string;
}) => {
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      qrCode.append(node);
    }
  }, []);

  useLayoutEffect(() => {
    qrCode.update({ data: value });

    const units = (qrCode._qr?.getModuleCount() ?? 0) * UNITS_PER_MODULE;

    if (units) {
      qrCode.update({ width: units, height: units });
    }
  }, [value]);

  return (
    // White in every theme: a QR code scans as dark on light.
    <div
      role="img"
      aria-label={label}
      className="rounded-card bg-white shadow-box"
      style={{ width: QR_TILE, height: QR_TILE, padding: QR_PADDING }}>
      <div
        ref={containerRef}
        className="h-full w-full [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
      />
    </div>
  );
};
