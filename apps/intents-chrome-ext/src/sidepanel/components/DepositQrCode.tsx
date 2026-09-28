import { useCallback, useEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';

import { AURORA_BASE64_LOGO } from '@aurora-is-near/intents-swap-widget';

/**
 * One module-level instance owns one DOM node, so exactly one of these may be
 * mounted at a time — `append` moves the rendered element to the latest
 * container.
 */
const qrCode = new QRCodeStyling({
  width: 184,
  height: 184,
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
    imageSize: 0.4,
    margin: 8,
  },
});

export const DepositQrCode = ({ address }: { address: string }) => {
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      qrCode.append(node);
    }
  }, []);

  useEffect(() => {
    qrCode.update({ data: address });
  }, [address]);

  return (
    <div className="mx-auto w-fit p-sw-lg rounded-[28px] bg-[#fff]">
      <div ref={containerRef} />
    </div>
  );
};
