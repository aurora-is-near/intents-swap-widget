import { useEffect } from 'react';

const isLetter = (key: string) => {
  return key.length === 1 && /^[a-z]$/i.test(key);
};

const isNumber = (key: string) => {
  return key.length === 1 && /^[0-9]$/.test(key);
};

const isAlphanumeric = (key: string) => {
  return isLetter(key) || isNumber(key);
};

export const useHandleKeyDown = (
  key: 'Escape' | 'ArrowDown' | 'ArrowUp' | 'Alphanumeric',
  onKeyPress: (key: string) => void,
  deps: unknown[] = [],
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (key === 'Alphanumeric' && isAlphanumeric(event.key)) {
        onKeyPress(event.key);

        return;
      }

      if (event.key === key) {
        onKeyPress(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, ...deps]);
};
