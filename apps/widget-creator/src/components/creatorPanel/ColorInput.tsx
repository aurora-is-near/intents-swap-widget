import { HexColorPicker } from 'react-colorful';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hasInfo?: boolean;
  disabled?: boolean;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function ColorInput({
  label,
  value,
  onChange,
  hasInfo,
  isOpen = false,
  onOpen,
  onClose,
}: ColorInputProps) {
  const handleOpen = () => {
    onOpen?.();
  };

  const handleClose = () => {
    onClose?.();
  };

  return (
    <div className="space-y-csw-md">
      <div className="flex items-center justify-between">
        <p
          className={`font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200`}>
          {label}
        </p>
        <div className={'p-csw-md bg-csw-gray-800 flex items-center gap-csw-md rounded-csw-md cursor-pointer'} onClick={handleOpen}>
          <div className={"w-[21px] h-[20px] rounded-csw-sm"} style={{ backgroundColor: value }} />
          <span className={"text-[14px] leading-3 text-csw-gray-50"}>{value}</span>
        </div>
      </div>
      {/* {hasInfo && <Info className="w-3 h-3 text-csw-gray-950 opacity-50" />} */}
      {isOpen && (
        <div className="bg-csw-gray-800 rounded-csw-md p-csw-md w-fit">
          <HexColorPicker color={value} onChange={onChange} />
          <div className="mt-csw-md flex items-center gap-csw-md">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="bg-csw-gray-700 rounded-csw-sm px-csw-sm py-csw-xs font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-50 outline-none flex-1"
            />
            <button
              onClick={handleClose}
              className="px-csw-md py-csw-xs bg-csw-accent-500 text-csw-gray-950 rounded-csw-sm font-semibold text-sm hover:opacity-90 transition-opacity">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
