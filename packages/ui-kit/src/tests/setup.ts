// Registers the jest-dom matchers (toHaveAttribute, toHaveFocus, …). The
// shared eslint config's jest-dom plugin auto-fixes assertions into these
// matchers, so they have to be available. Harmless in node-environment
// tests: the matchers only touch the DOM when called.
import '@testing-library/jest-dom/vitest';
