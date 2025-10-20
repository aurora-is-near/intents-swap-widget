import { useCallback, useState } from 'react';

export const useDemoWallet = () => {
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(() => {
    setIsConnecting(true);
    // Mock wallet connection for demo purposes
    setTimeout(() => {
      setAddress('test.near');
      setIsConnecting(false);
    }, 1000);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(undefined);
  }, []);

  return {
    address,
    isConnecting,
    connect,
    disconnect,
  };
};
