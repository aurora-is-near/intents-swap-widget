import { PropsWithChildren, useEffect, useState } from 'react';
import { useCreator } from '../../hooks/useCreatorConfig';
import { DEFAULT_BACKGROUND_COLOR } from '../../constants';
import { getWidgetColor } from '../../utils/get-widget-color';
import AuroraIcon from '../../assets/icons/aurora.svg?react';

export const WidgetSection = ({ children }: PropsWithChildren) => {
  const { state } = useCreator();
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_BACKGROUND_COLOR,
  );

  useEffect(() => {
    if (state.stylePreset === 'bold') {
      setBackgroundColor(
        state.showContainerWrapper
          ? getWidgetColor('accent-50')
          : getWidgetColor('accent-950'),
      );

      return;
    }

    setBackgroundColor(
      state.showContainerWrapper
        ? getWidgetColor('gray-50')
        : getWidgetColor('gray-950'),
    );
  }, [state]);

  return (
    <section
      className="relative flex-grow rounded-csw-lg px-csw-2xl pb-csw-4xl max-w-full md:max-w-none w-full overflow-y-auto custom-scrollbar custom-scrollbar-offset-2xl"
      style={{ backgroundColor }}>
      {children}

      <div
        className="absolute w-full flex items-center justify-center gap-csw-2md text-center text-csw-label-md text-csw-gray-300 p-csw-2xl"
        // for some reason tailwind classes are not working here
        style={{ bottom: 0, left: 0 }}>
        Powered by
        <AuroraIcon className="w-[18px] h-[18px] text-csw-gray-300" />
        Aurora Labs
      </div>
    </section>
  );
};
