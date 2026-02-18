import { ComponentType } from 'react';

const CONTAINER_SIZE = 28;

export type WalletIconProps = {
  Icon: ComponentType;
  backgroundColor?: string;
};

export const WalletIcon = ({
  Icon,
  backgroundColor = '#363636',
}: WalletIconProps) => {
  return (
    <div
      style={{
        width: CONTAINER_SIZE,
        height: CONTAINER_SIZE,
        borderRadius: 6,
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon />
    </div>
  );
};
