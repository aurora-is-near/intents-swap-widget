import { ColorInputGroup } from './ColorInputGroup';
import { ColorInputItem } from './ColorInputItem';
import { ColorPicker } from './ColorPicker';

interface ColorInputItemsProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isColorPickerOpen: boolean;
  onOpenColorPicker: () => void;
  onCloseColorPicker: () => void;
  themes: (`#${string}` | 'dark' | 'light')[];
}

export const ColorInputItems = ({
  label,
  value,
  onChange,
  isColorPickerOpen,
  onOpenColorPicker,
  onCloseColorPicker,
  themes,
}: ColorInputItemsProps) => {
  return (
    <ColorInputGroup label={label}>
      {themes.map((themeColor) => {
        const isActive = themeColor.toLowerCase() === value.toLowerCase();

        return (
          <ColorInputItem
            key={themeColor}
            isActive={isActive}
            onClick={() => {
              onChange(themeColor);
            }}
            color={themeColor}
          />
        );
      })}
      <ColorPicker
        value={value}
        onChange={onChange}
        isOpen={isColorPickerOpen}
        onOpen={onOpenColorPicker}
        onClose={onCloseColorPicker}
        isActive={
          !themes.some(
            (theme) => theme.toLowerCase() === value.toLowerCase(),
          ) || isColorPickerOpen
        }
      />
    </ColorInputGroup>
  );
};
