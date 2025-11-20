import '@testing-library/jest-dom';
import * as React from 'react';

import enableHooks from 'jest-react-hooks-shallow';
import { TextDecoder, TextEncoder } from 'util';
import { configureToMatchImageSnapshot } from 'jest-image-snapshot';
import ResizeObserver from 'resize-observer-polyfill';

global.React = React;

process.env.FORWARDER_API_KEY = 'test-forwarder-api-key';
process.env.NEXT_PUBLIC_MUNZEN_API_KEY = 'test-munzen-api-key';
process.env.MUNZEN_API_SECRET = 'test-munzen-api-secret';
process.env.BLOCKSCOUT_ENCRYPTION_KEY = 'test-blockscout-encryption-key';
process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-server-token';

Object.assign(global, { TextDecoder, TextEncoder, ResizeObserver });

enableHooks(jest);

// for visual regression testing
const toMatchImageSnapshot = configureToMatchImageSnapshot({
  diffDirection: 'vertical',
  dumpDiffToConsole: false,
  comparisonMethod: 'ssim',
  failureThreshold: 0.01,
  failureThresholdType: 'percent',
  customSnapshotsDir: 'tests/__image_snapshots__',
});

expect.extend({ toMatchImageSnapshot });

afterAll(() => {
  jest.clearAllTimers();
});

if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
}

Object.defineProperty(global, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
