import { useCallback, useSyncExternalStore } from 'react';

const subscribe = (callback: () => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};

const getSnapshot = () => window.location.pathname;

export function useLocationPath() {
  const pathname = useSyncExternalStore(subscribe, getSnapshot);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path);
    // Dispatch popstate so the store picks up the change
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  return { pathname, navigate };
}
