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
    from: (data: any) => new Uint8Array(data),
    isBuffer: () => false,
  };
}

export {};
