import { HexColorPicker } from 'react-colorful';
import ColorPickerIcon from '../../assets/icons/color-picker.svg?react';
import { ColorInputItem } from './ColorInputItem';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  isActive?: boolean;
}

export const ColorPicker = ({
  value,
  onChange,
  isOpen,
  onOpen,
  onClose,
  isActive,
}: ColorPickerProps) => {
  return (
    <>
      <ColorInputItem
        isActive={!!isActive}
        onClick={() => {
          onOpen();
        }}>
        <ColorPickerIcon />
      </ColorInputItem>
      {isOpen && (
        <div className="bg-csw-gray-900 rounded-csw-md p-csw-md w-fit absolute right-csw-6xl shadow-[0_10px_15px_8px_rgba(0,0,0,0.22)] flex flex-col items-center">
          <HexColorPicker color={value} onChange={onChange} />
          <div className="mt-csw-md flex items-center gap-csw-md">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="bg-csw-gray-700 rounded-csw-sm px-csw-sm py-csw-xs font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-50 outline-none flex-1"
            />
            <button
              onClick={onClose}
              className="px-csw-md py-csw-xs bg-csw-accent-500 text-csw-gray-950 rounded-csw-sm font-semibold text-sm hover:opacity-90 transition-opacity select-none cursor-pointer">
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
