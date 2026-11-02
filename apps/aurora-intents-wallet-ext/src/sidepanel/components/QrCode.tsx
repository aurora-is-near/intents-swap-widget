import { useCallback, useLayoutEffect, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';

import { AURORA_BASE64_LOGO } from '@aurora-is-near/intents-swap-widget';

/** SVG units per module: whole numbers, so modules tile without gaps. */
const UNITS_PER_MODULE = 16;

/**
 * One module-level instance owns one DOM node, so exactly one of these may be
 * mounted at a time — `append` moves the rendered element to the latest
 * container.
 */
const qrCode = new QRCodeStyling({
  image: AURORA_BASE64_LOGO,
  type: 'svg',
  // H + a small logo: the centre image must not wipe data modules.
  qrOptions: { errorCorrectionLevel: 'H' },
  dotsOptions: { color: '#161926', type: 'extra-rounded' },
  backgroundOptions: { color: '#fff' },
  cornersSquareOptions: { type: 'dot' },
  cornersDotOptions: { type: 'dot' },
  imageOptions: {
    crossOrigin: 'anonymous',
    hideBackgroundDots: true,
    imageSize: 0.3,
    margin: 2 * UNITS_PER_MODULE,
  },
});

type Props = {
  value: string;
  /** Target width and height of the code, in CSS px. */
  size?: number;
};

/**
 * The code is drawn at exactly `modules × 16` units and shown at a whole
 * number of CSS px per module. Otherwise module edges land between pixels and
 * anti-aliasing draws hairline seams through merged modules, and the
 * library's rounding leaves an empty margin around long payloads such as
 * WalletConnect URIs.
 */
export const QrCode = ({ value, size = 264 }: Props) => {
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
    <div className="mx-auto w-fit rounded-sw-lg bg-[#fff] p-sw-lg">
      <div
        ref={containerRef}
        style={{ width: side, height: side }}
        className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      />
    </div>
  );
};
