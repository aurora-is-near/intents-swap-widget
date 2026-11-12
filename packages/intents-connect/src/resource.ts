import { proxy, ref } from 'valtio/vanilla';

export type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';

export type ResourceState<T> = {
  status: ResourceStatus;
  /** What the data belongs to (an account, an address…). */
  key?: string;
  /** Kept while a refresh of the SAME key is loading or after it fails. */
  data?: T;
  error?: Error;
  /** Epoch milliseconds of the last success. */
  updatedAt?: number;
};

export type Resource<T> = {
  /** A valtio proxy — subscribe to it, or `useSnapshot` it in React. */
  readonly state: ResourceState<T>;
  /**
   * Loads `key`. Concurrent calls for the same key share one request; a
   * response for a key that is no longer current is dropped.
   */
  refresh: (key: string) => Promise<T | undefined>;
  /** Back to idle with no data, e.g. when the wallet disconnects. */
  reset: () => void;
};

/**
 * A keyed, single-flight async value as a valtio store: the shared state
 * behind every data hook, and usable without React.
 *
 * Switching to a new key clears the old data at once, so one account's
 * balances never show while another's load.
 */
export const createResource = <T>(
  fetcher: (key: string) => Promise<T>,
  { now = Date.now }: { now?: () => number } = {},
): Resource<T> => {
  const state = proxy<ResourceState<T>>({ status: 'idle' });

  let inFlight: { key: string; promise: Promise<T | undefined> } | undefined;

  return {
    state,

    refresh: (key) => {
      if (inFlight?.key === key) {
        return inFlight.promise;
      }

      if (state.key !== key) {
        state.data = undefined;
        state.error = undefined;
        state.updatedAt = undefined;
      }

      state.key = key;
      state.status = 'loading';

      const promise = fetcher(key).then(
        (value) => {
          if (state.key === key) {
            state.data = value;
            state.error = undefined;
            state.status = 'success';
            state.updatedAt = now();
          }

          return value;
        },
        (error: unknown) => {
          if (state.key === key) {
            state.error = ref(
              error instanceof Error ? error : new Error(String(error)),
            );
            state.status = 'error';
          }

          return undefined;
        },
      );

      const entry = { key, promise };

      inFlight = entry;
      void promise.finally(() => {
        if (inFlight === entry) {
          inFlight = undefined;
        }
      });

      return promise;
    },

    reset: () => {
      inFlight = undefined;
      state.key = undefined;
      state.data = undefined;
      state.error = undefined;
      state.updatedAt = undefined;
      state.status = 'idle';
    },
  };
};

export type ResourceCache<T> = {
  /** The resource for `key`, created on first use and shared afterwards. */
  get: (key: string) => Resource<T>;
  clear: () => void;
};

/**
 * One `Resource` per key, so readers of different keys (two accounts, two
 * token filters) never take turns clearing each other's data.
 */
export const createResourceCache = <T>(
  fetcher: (key: string) => Promise<T>,
  options?: { now?: () => number },
): ResourceCache<T> => {
  const resources = new Map<string, Resource<T>>();

  return {
    get: (key) => {
      let resource = resources.get(key);

      if (!resource) {
        resource = createResource(fetcher, options);
        resources.set(key, resource);
      }

      return resource;
    },
    clear: () => resources.clear(),
  };
};
