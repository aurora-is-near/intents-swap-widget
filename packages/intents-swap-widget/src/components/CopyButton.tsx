import copy from 'copy-text-to-clipboard';
import * as Icons from 'lucide-react';

export const CopyButton = ({ value }: { value: string }) => (
  <button
    type="button"
    onClick={() => copy(value)}
    className="text-sw-mauve-300 hover:text-sw-mauve-50 cursor-pointer transition-all duration-300 [transition-timing-function:cubic-bezier(0.175,0.885,0.32,1.275)] active:-translate-y-1 active:scale-x-90 active:scale-y-110">
    <Icons.Copy size={16} />
  </button>
);
