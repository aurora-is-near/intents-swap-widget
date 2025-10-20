/* eslint-disable @typescript-eslint/no-explicit-any, no-plusplus */
(globalThis as any).global = globalThis;

if (typeof (globalThis as any).crypto === 'undefined') {
  (globalThis as any).crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }

      return arr;
    },
  };
}

if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = {
    from: (data: any) => {
      const uint8Array = new Uint8Array(data);

      // Add toString method to support base64 encoding
      (uint8Array as any).toString = (encoding?: string) => {
        if (encoding === 'base64') {
          return btoa(String.fromCharCode(...uint8Array));
        }

        return uint8Array.toString();
      };

      return uint8Array;
    },
    isBuffer: () => false,
  };
}

export {};
