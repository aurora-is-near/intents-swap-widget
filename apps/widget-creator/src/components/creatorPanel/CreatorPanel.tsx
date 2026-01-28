import { useState } from 'react';
import ResetIcon from '../../assets/icons/reset.svg?react';
import { OutlinedButton } from '../../uikit/Button';
import { Design } from './Design';
import { Configure } from './Configure';
import { useCreator } from '../../hooks/useCreatorConfig';
import { cn } from '../../utils/cn';

const SCROLLBAR_OFFSET_CLASSNAME = 'md:mr-csw-sm';
const DESIGN_TAB_ID = 'design-tab';
const CONFIGURE_TAB_ID = 'configure-tab';
const DESIGN_PANEL_ID = 'design-panel';
const CONFIGURE_PANEL_ID = 'configure-panel';

type TabKey = 'design' | 'configure';

export function CreatorPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('design');
  const { dispatch } = useCreator();

  function handleReset() {
    dispatch({ type: 'RESET_ALL' });
  }

  return (
    <div
      className={cn(
        'px-csw-2xl pt-[22px] pb-csw-2xl overflow-y-auto custom-scrollbar custom-scrollbar-offset-2xl h-full',
        SCROLLBAR_OFFSET_CLASSNAME,
      )}>
      <div role="tablist" className="flex items-center gap-csw-2xl mb-[22px]">
        <button
          role="tab"
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

        <button
          role="tab"
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

        <OutlinedButton
          onClick={handleReset}
          size="sm"
          fluid
          className="ml-auto">
          <ResetIcon className="w-[16px] h-[16px]" />
          Reset
        </OutlinedButton>
      </div>

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
