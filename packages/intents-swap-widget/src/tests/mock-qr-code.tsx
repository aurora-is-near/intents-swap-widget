import { jest } from '@jest/globals';

jest.mock('react-qrcode-logo', () => ({
  QRCode: () => <span aria-label="qr-code" />,
}));
