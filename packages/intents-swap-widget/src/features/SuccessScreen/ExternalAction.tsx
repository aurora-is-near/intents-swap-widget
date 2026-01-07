import { OpenInNewW700 as OpenInNew } from '@material-symbols-svg/react-rounded/icons/open-in-new';

type Props = {
  url: string;
};

export const ExternalAction = ({ url }: Props) => (
  <a
    target="_blank"
    href={url}
    className="text-sw-accent-300 hover:text-sw-accent-50 cursor-pointer"
    rel="noreferrer">
    <OpenInNew size={16} />
  </a>
);
