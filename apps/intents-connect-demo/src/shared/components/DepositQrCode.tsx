import { useCallback, useEffect } from 'react';

import QRCodeStyling from 'qr-code-styling';
import { AURORA_BASE64_LOGO } from '@aurora-is-near/intents-swap-widget';

/**
 * Duplicated from the widget's own ExternalDeposit QR (same options, same
 * append/update wiring) so the demo stays free of widget internals until the
 * two are de-duplicated.
 *
 * Module-level, like the widget's: one instance owns one DOM node, so exactly
 * one of these may be mounted at a time — `append` moves the rendered element
 * to whichever container mounted last.
 */
const qrCode = new QRCodeStyling({
  width: 200,
  height: 200,
  image: AURORA_BASE64_LOGO,
  type: 'svg',
  /** H + smaller logo area: center image must not wipe data modules without ECC */
  qrOptions: {
    errorCorrectionLevel: 'H',
  },
  dotsOptions: {
    color: '#161926',
    type: 'extra-rounded',
  },
  backgroundOptions: {
    color: '#fff',
  },
  cornersSquareOptions: {
    type: 'dot',
  },
  cornersDotOptions: {
    type: 'dot',
  },
  imageOptions: {
    crossOrigin: 'anonymous',
    /** Coefficient 0–1 (not px). Over ~0.5 hurts scan reliability; default 0.4 */
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
    <div className="mx-auto w-fit p-sw-lg mb-sw-xl rounded-[32px] bg-[#fff]">
      <div ref={containerRef} />
    </div>
  );
};
