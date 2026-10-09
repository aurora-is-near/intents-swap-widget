// Dev only: lets the panel render as a plain page (http://localhost:5181/
// sidepanel.html) for UI work, with chrome.storage.local kept in localStorage.
// Loaded by main.tsx only when the page is not running inside the extension.

type Listener = (
  changes: Record<string, chrome.storage.StorageChange>,
  area: string,
) => void;

const PREFIX = 'dev-chrome-storage:';
const listeners = new Set<Listener>();

const readKey = (key: string): unknown => {
  const raw = localStorage.getItem(PREFIX + key);

  return raw === null ? undefined : (JSON.parse(raw) as unknown);
};

const local = {
  get: (key: string) => Promise.resolve({ [key]: readKey(key) }),
  set: (items: Record<string, unknown>) => {
    const changes: Record<string, chrome.storage.StorageChange> = {};

    Object.entries(items).forEach(([key, newValue]) => {
      changes[key] = { oldValue: readKey(key), newValue };
      localStorage.setItem(PREFIX + key, JSON.stringify(newValue));
    });

    listeners.forEach((listener) => listener(changes, 'local'));

    return Promise.resolve();
  },
};

const noopEvent = { addListener: () => {}, removeListener: () => {} };

function createSession() {
  const items: Record<string, unknown> = {};

  return {
    get: (key: string) => Promise.resolve({ [key]: items[key] }),
    set: (values: Record<string, unknown>) => {
      const changes: Record<string, chrome.storage.StorageChange> = {};

      Object.entries(values).forEach(([key, newValue]) => {
        changes[key] = { oldValue: items[key], newValue };
        items[key] = newValue;
      });

      listeners.forEach((listener) => listener(changes, 'session'));

      return Promise.resolve();
    },
    remove: (key: string) => {
      const oldValue = items[key];

      delete items[key];
      listeners.forEach((listener) =>
        listener({ [key]: { oldValue } }, 'session'),
      );

      return Promise.resolve();
    },
  };
}

Object.assign(globalThis, {
  chrome: {
    runtime: { id: 'dev', onMessage: noopEvent },
    // No active web page outside the extension.
    tabs: {
      query: () => Promise.resolve([]),
      onActivated: noopEvent,
      onUpdated: noopEvent,
    },
    storage: {
      local,
      // In memory, like the real one; lets a test leave an app launch.
      session: createSession(),
      onChanged: {
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
      },
    },
  },
});

export {};
