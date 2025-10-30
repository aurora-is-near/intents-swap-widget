import * as Icons from 'lucide-react';

type Props = {
  url: string;
};

export const ExternalAction = ({ url }: Props) => (
  <a
    target="_blank"
    href={url}
    className="text-sw-mauve-300 hover:text-sw-mauve-50 cursor-pointer"
    rel="noreferrer">
    <Icons.ExternalLink size={16} />
  </a>
);
