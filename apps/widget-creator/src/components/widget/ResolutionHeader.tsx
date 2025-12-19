import { Laptop } from 'lucide-react';
import MobileIcon from '../../assets/icons/mobile.svg?react';

type Props = {
  resolutionView: 'desktop' | 'mobile';
  setResolutionView: (view: 'desktop' | 'mobile') => void;
};

export function ResolutionHeader({ resolutionView, setResolutionView }: Props) {
  return (
    <div className="items-center justify-between py-csw-2xl hidden md:flex">
      <div className="flex items-center gap-csw-2md">
        <div
          onClick={() => setResolutionView('desktop')}
          className={
            resolutionView === 'desktop'
              ? 'p-csw-md bg-csw-gray-50 rounded-csw-md cursor-pointer'
              : 'p-csw-md cursor-pointer'
          }>
          <Laptop
            className={`w-[20px] h-[20px] ${resolutionView === 'desktop' ? 'text-csw-gray-950' : 'text-csw-gray-200'}`}
            strokeWidth={2.4}
          />
        </div>
        <div
          onClick={() => setResolutionView('mobile')}
          className={
            resolutionView === 'mobile'
              ? 'p-csw-md bg-csw-gray-50 rounded-csw-md cursor-pointer'
              : 'p-csw-md cursor-pointer'
          }>
          <MobileIcon
            className={`w-[20px] h-[20px] ${resolutionView === 'mobile' ? 'text-csw-gray-950' : 'text-csw-gray-200'}`}
          />
        </div>
      </div>
    </div>
  );
}
