import { PropsWithChildren, useEffect, useState } from 'react';
import { useCreator } from '../../hooks/useCreatorConfig';
import { DEFAULT_BACKGROUND_COLOR } from '../../constants';
import { getWidgetColor } from '../../utils/get-widget-color';

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
      className="flex-grow rounded-csw-lg px-csw-2xl pb-csw-4xl max-w-full md:max-w-none w-full"
      style={{ backgroundColor }}>
      {children}
    </section>
  );
};
