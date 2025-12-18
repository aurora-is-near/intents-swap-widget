import { useEffect } from 'react';
import { isBrowser } from 'browser-or-node';

export const useHandleKeyDown = (key: string, onKeyPress: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === key) {
        onKeyPress();
      }
    };

    if (isBrowser) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (isBrowser) {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [onKeyPress]);
};
