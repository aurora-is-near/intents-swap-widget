import { useEffect, useRef } from 'react';
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
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Close the colour picker when clicking outside
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        !pickerRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div ref={triggerRef}>
        <ColorInputItem
          isActive={!!isActive}
          onClick={() => {
            onOpen();
          }}>
          <ColorPickerIcon />
        </ColorInputItem>
      </div>
      {isOpen && (
        <div
          ref={pickerRef}
          className="bg-csw-gray-900 rounded-csw-md p-csw-md w-fit absolute right-csw-6xl shadow-[0_10px_15px_8px_rgba(0,0,0,0.22)] flex flex-col items-center">
          <HexColorPicker color={value} onChange={onChange} />
          <div className="mt-csw-xl flex items-center gap-csw-2md">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="bg-csw-gray-700 rounded-csw-sm px-csw-sm py-csw-xs font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-50 outline-none flex-1"
            />
            <button
              onClick={onClose}
              className="px-csw-lg leading-none py-csw-2md bg-csw-gray-50 text-csw-gray-950 rounded-csw-sm font-semibold text-sm hover:opacity-90 transition-opacity select-none cursor-pointer">
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};
