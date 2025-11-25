
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Design } from './Design';
import { Configure } from './Configure';
import { OutlinedButton } from '@aurora-is-near/intents-swap-widget';
export function CreatorPanel() {
  const [activeTab, setActiveTab] = useState<'configure' | 'design'>('configure');

  function handleReset() {

  }
  return (
    <div className="px-sw-2xl pt-[22px] pb-sw-2xl">
      {/* Header */}
      <aside>
        <div className="flex items-center gap-sw-2xl mb-[22px]">
          <button
            onClick={() => setActiveTab('configure')}
            className={`font-medium text-xl leading-[22px] tracking-[-0.5px] pb-2 border-b-2 transition-colors ${
              activeTab === 'configure'
                ? 'text-sw-gray-50 border-b-sw-gray-50'
                : 'text-sw-gray-200 border-b-transparent'
            }`}>
            Configure
          </button>
          <button
            onClick={() => setActiveTab('design')}
            className={`font-medium text-xl leading-[22px] tracking-[-0.5px] pb-2 border-b-2 transition-colors ${
              activeTab === 'design'
                ? 'text-sw-gray-50 border-b-sw-gray-50'
                : 'text-sw-gray-200 border-b-transparent'
            }`}>
            Design
          </button>
          <OutlinedButton onClick={handleReset} size="md" className="ml-auto">
            <RotateCcw className="w-sw-lg h-sw-lg" />
            Reset
          </OutlinedButton>
        </div>
      </aside>

      <aside>{activeTab === 'configure' ? <Configure /> : <Design />}</aside>
    </div>
  );
}
