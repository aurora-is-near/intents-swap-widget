import { useState } from 'react';
import ResetIcon from '../../assets/icons/reset.svg?react';
import { OutlinedButton } from '../../uikit/Button';
import { Design } from './Design';
import { Configure } from './Configure';
import { useCreator } from '../../hooks/useCreatorConfig';
import { cn } from '../../utils/cn';

const SCROLLBAR_OFFSET_CLASSNAME = 'md:mr-csw-sm';

export function CreatorPanel() {
  const [activeTab, setActiveTab] = useState<'configure' | 'design'>('design');

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
      <aside>
        <div className="flex items-center gap-csw-2xl mb-[22px]">
          <button
            onClick={() => setActiveTab('design')}
            className={`font-medium text-xl leading-[22px] tracking-[-0.5px] pb-2 border-b-2 transition-colors ${
              activeTab === 'design'
                ? 'text-csw-gray-50 border-b-csw-gray-50'
                : 'text-csw-gray-200 border-b-transparent cursor-pointer'
            }`}>
            Design
          </button>
          <button
            onClick={() => setActiveTab('configure')}
            className={`font-medium text-xl leading-[22px] tracking-[-0.5px] pb-2 border-b-2 transition-colors ${
              activeTab === 'configure'
                ? 'text-csw-gray-50 border-b-csw-gray-50'
                : 'text-csw-gray-200 border-b-transparent cursor-pointer'
            }`}>
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
      </aside>

      <aside>{activeTab === 'configure' ? <Configure /> : <Design />}</aside>
    </div>
  );
}
