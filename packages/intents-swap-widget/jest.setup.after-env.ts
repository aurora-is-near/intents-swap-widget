import '@testing-library/jest-dom';
import * as React from 'react';

import enableHooks from 'jest-react-hooks-shallow';
import ResizeObserver from 'resize-observer-polyfill';
import { configureToMatchImageSnapshot } from 'jest-image-snapshot';
import { TextDecoder, TextEncoder } from 'util';

global.React = React;

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
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
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
