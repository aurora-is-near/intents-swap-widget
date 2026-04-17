import { clsx } from 'clsx';
import { PropsWithChildren, useEffect, useState } from 'react';

import { useCreator } from '../../hooks/useCreatorConfig';
import { DEFAULT_BACKGROUND_COLOR } from '../../constants';
import { getWidgetColor } from '../../utils/get-widget-color';
import AuroraIcon from '../../assets/icons/aurora.svg?react';

export const WidgetSection = ({
  isEmbedded,
  children,
}: PropsWithChildren<{ isEmbedded?: boolean }>) => {
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
      className={clsx(
        'relative flex flex-col flex-grow max-w-full md:max-w-none w-full px-csw-2xl overflow-y-auto custom-scrollbar custom-scrollbar-offset-2xl',
        {
          'justify-between sm:rounded-csw-lg pb-csw-4xl': !isEmbedded,
          'h-full items-center justify-center py-csw-2xl': isEmbedded,
        },
      )}
      style={{ backgroundColor }}>
      {children}

      {!isEmbedded && (
        <div className="w-full flex items-center justify-center gap-csw-2md text-center text-csw-label-md text-csw-gray-300 pt-csw-3xl">
          Powered by
          <AuroraIcon className="w-[18px] h-[18px] text-csw-gray-300" />
          Aurora Labs
        </div>
      )}
    </section>
  );
};
