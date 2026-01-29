import { useEffect, useState } from 'react';
import { CloseW700 as Close } from '@material-symbols-svg/react-rounded/icons/close';

import { Export } from './Export';
import { Navigation } from './Navigation';
import type { NavigationTabs } from './Navigation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationModal({ isOpen, onClose }: ModalProps) {
  const [selected, setSelected] = useState<NavigationTabs>('embed-code');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed z-50 w-full h-full top-[0px] left-[0px]">
      <div
        onClick={onClose}
        className="flex items-center justify-center w-full h-full"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.70)',
          backdropFilter: 'blur(4px)',
        }}>
        <div
          className="relative z-50 sm:max-h-[90vh] sm:min-h-[500px] sm:rounded-csw-lg bg-csw-gray-950 overflow-hidden flex flex-col sm:flex-row sm:border sm:border-csw-gray-900 sm:mx-csw-xl h-full w-full sm:w-auto sm:h-auto"
          onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onClose}
            className="absolute top-csw-3xl sm:top-csw-xl right-csw-xl bg-csw-gray-950 p-csw-md rounded-csw-md hover:bg-csw-gray-800 transition-colors flex-shrink-0 cursor-pointer">
            <Close size={16} className="text-csw-gray-50" />
          </button>

          <Navigation selected={selected} onSelect={setSelected} />

          <div className="px-csw-2xl max-w-[600px] overflow-auto">
            <Export />
          </div>
        </div>
      </div>
    </div>
  );
}
