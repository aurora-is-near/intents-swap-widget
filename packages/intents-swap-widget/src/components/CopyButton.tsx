import copy from 'copy-text-to-clipboard';
import { ContentCopyW700 as ContentCopy } from '@material-symbols-svg/react-rounded/icons/content-copy';

export const CopyButton = ({ value }: { value: string }) => (
  <button
    type="button"
    onClick={() => copy(value)}
    className="text-sw-gray-200 hover:text-sw-gray-50 cursor-pointer transition-all duration-300 [transition-timing-function:cubic-bezier(0.175,0.885,0.32,1.275)] active:-translate-y-1 active:scale-x-90 active:scale-y-110">
    <ContentCopy size={16} />
  </button>
);
