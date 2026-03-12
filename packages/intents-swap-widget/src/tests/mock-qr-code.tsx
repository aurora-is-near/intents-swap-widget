import { jest } from '@jest/globals';

jest.mock('react-qrcode-logo', () => ({
  QRCode: () => <img alt="qr-code" />,
}));
