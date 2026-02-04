export type AppKit = {
  open: () => Promise<void | { hash: string }>;
};
