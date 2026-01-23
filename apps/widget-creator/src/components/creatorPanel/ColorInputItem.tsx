import { ReactNode, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { useCreator } from '../../hooks/useCreatorConfig';
import { getWidgetColor } from '../../utils/get-widget-color';

interface ColorInputItemProps {
  children?: ReactNode;
  onClick: () => void;
  isActive: boolean;
  color?: string;
}

export const ColorInputItem = ({
  isActive,
  onClick,
  children,
  color,
}: ColorInputItemProps) => {
  const { state } = useCreator();
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(
    () => {
      if (color && !['light', 'dark'].includes(color)) {
        return color;
      }
    },
  );

  useEffect(() => {
    if (!color || !['light', 'dark'].includes(color)) {
      return;
    }

    const showLightColor =
      (color === 'light' && !isActive) || (color === 'dark' && !isActive);

    if (state.stylePreset === 'bold') {
      setBackgroundColor(
        showLightColor
          ? getWidgetColor('accent-50')
          : getWidgetColor('accent-950'),
      );

      return;
    }

    setBackgroundColor(
      showLightColor ? getWidgetColor('gray-50') : getWidgetColor('gray-950'),
    );
  }, [state]);

  return (
    <div
      className={cn(
        'p-csw-md flex items-center rounded-csw-md cursor-pointer',
        isActive
          ? 'border-[1.5px] border-csw-gray-300 bg-csw-gray-800'
          : 'border border-csw-gray-700',
      )}
      onClick={onClick}>
      <div
        className="w-[20px] h-[20px] rounded-full"
        style={{ backgroundColor }}>
        {children}
      </div>
    </div>
  );
};
