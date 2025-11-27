'use client';

import { RefObject, useEffect } from 'react';

export function useClickOutside(
  ref: RefObject<any> | null,
  callback: () => void,
) {
  const handleClick = (e: MouseEvent) => {
    if (ref?.current && !ref.current.contains(e.target as Node)) {
      callback();
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  });
}
