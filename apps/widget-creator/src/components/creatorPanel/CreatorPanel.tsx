import { useState } from 'react';
import ResetIcon from '../../assets/icons/reset.svg?react';
import { OutlinedButton } from '../../uikit/Button';
import { Design } from './Design';
import { Configure } from './Configure';
import { useCreator } from '../../hooks/useCreatorConfig';
import { cn } from '../../utils/cn';

import { useApiKeys } from '@/api/hooks';

const DESIGN_TAB_ID = 'design-tab';
const CONFIGURE_TAB_ID = 'configure-tab';
const DESIGN_PANEL_ID = 'design-panel';
const CONFIGURE_PANEL_ID = 'configure-panel';

type TabKey = 'design' | 'configure';

export function CreatorPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('configure');
  const { dispatch } = useCreator();

  // preload API keys
  useApiKeys();

  function handleReset() {
    dispatch({ type: 'RESET_ALL' });
  }

  return (
    <div className="px-csw-2xl sm:pt-[22px] pb-csw-2xl overflow-y-auto custom-scrollbar custom-scrollbar-offset-2xl h-full w-full">
      <div className="flex items-center mb-[22px]">
        <div role="tablist" className="flex gap-csw-2xl">
          <button
            role="tab"
            type="button"
            id={CONFIGURE_TAB_ID}
            aria-selected={activeTab === 'configure'}
            aria-controls={CONFIGURE_PANEL_ID}
            tabIndex={activeTab === 'configure' ? 0 : -1}
            onClick={() => setActiveTab('configure')}
            className={cn(
              'font-medium text-xl leading-[22px] tracking-[-0.5px] pb-2 border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-csw-accent-500 cursor-pointer',
              activeTab === 'configure'
                ? 'text-csw-gray-50 border-b-csw-gray-50'
                : 'text-csw-gray-200 border-b-transparent',
            )}>
            Configure
          </button>
          <button
            role="tab"
            type="button"
            id={DESIGN_TAB_ID}
            aria-selected={activeTab === 'design'}
            aria-controls={DESIGN_PANEL_ID}
            tabIndex={activeTab === 'design' ? 0 : -1}
            onClick={() => setActiveTab('design')}
            className={cn(
              'font-medium text-xl leading-[22px] tracking-[-0.5px] pb-2 border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-csw-accent-500 cursor-pointer',
              activeTab === 'design'
                ? 'text-csw-gray-50 border-b-csw-gray-50'
                : 'text-csw-gray-200 border-b-transparent',
            )}>
            Design
          </button>
        </div>

        <div className="ml-auto">
          <OutlinedButton onClick={handleReset} size="sm" fluid>
            <ResetIcon className="w-[16px] h-[16px]" />
            Reset
          </OutlinedButton>
        </div>
      </div>

      {/* TAB PANELS */}
      <div
        role="tabpanel"
        id={DESIGN_PANEL_ID}
        aria-labelledby={DESIGN_TAB_ID}
        hidden={activeTab !== 'design'}>
        <Design />
      </div>

      <div
        role="tabpanel"
        id={CONFIGURE_PANEL_ID}
        aria-labelledby={CONFIGURE_TAB_ID}
        hidden={activeTab !== 'configure'}>
        <Configure />
      </div>
    </div>
  );
}
