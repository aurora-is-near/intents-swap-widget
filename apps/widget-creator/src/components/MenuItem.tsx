type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
} & (
  | {
      onClick: () => void;
      href?: never;
    }
  | {
      onClick?: never;
      href: string;
    }
);

const CLASS_NAME =
  'flex items-center gap-csw-lg px-csw-lg py-csw-xl rounded-csw-md text-csw-gray-200 hover:bg-csw-gray-900 hover:text-csw-gray-50 transition-colors cursor-pointer text-sm font-medium';

export const MenuItem = ({ icon, label, onClick, href }: MenuItemProps) => {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={CLASS_NAME}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={CLASS_NAME}>
      {icon}
      {label}
    </button>
  );
};
