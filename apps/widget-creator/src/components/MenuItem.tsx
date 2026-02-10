type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
} & (
  | {
      onClick: () => void;
      href?: never;
      to?: never;
    }
  | {
      onClick?: never;
      href: string;
      to?: never;
    }
  | {
      onClick?: never;
      href?: never;
      to: string;
      navigate: (path: string) => void;
    }
);

const CLASS_NAME =
  'flex items-center gap-csw-lg px-csw-lg py-csw-xl rounded-csw-md text-csw-gray-200 hover:bg-csw-gray-900 hover:text-csw-gray-50 transition-colors cursor-pointer text-sm font-medium';

export const MenuItem = (props: MenuItemProps) => {
  const { icon, label } = props;

  if ('to' in props && props.to) {
    return (
      <a
        href={props.to}
        onClick={(e) => {
          e.preventDefault();
          props.navigate(props.to);
        }}
        className={CLASS_NAME}>
        {icon}
        {label}
      </a>
    );
  }

  if ('href' in props && props.href) {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className={CLASS_NAME}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className={CLASS_NAME}>
      {icon}
      {label}
    </button>
  );
};
