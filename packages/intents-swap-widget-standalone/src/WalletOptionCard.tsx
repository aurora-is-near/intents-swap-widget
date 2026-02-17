import { WalletIcon, WalletIconProps } from "./WalletIcon";

type WalletOptionCardProps = {
  onClick: () => void;
  title: string;
  description: string;
  icons: WalletIconProps[];
};

export const WalletOptionCard = ({
  onClick,
  title,
  description,
  icons,
}: WalletOptionCardProps) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      color: '#F3F3F5',
      backgroundColor: '#252525',
      cursor: 'pointer',
      textAlign: 'left',
    }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#B2B5C1',
          marginTop: 8,
          maxWidth: 170,
        }}>
        {description}
      </div>
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
        flexShrink: 0,
        marginLeft: 16,
      }}>
      {icons.map((iconProps, i) => (
        <WalletIcon key={i} {...iconProps} />
      ))}
    </div>
  </button>
);
