import { PropsWithChildren } from 'react';
import { useCreator } from '../../hooks/useCreatorConfig';

export const WidgetSection = ({ children }: PropsWithChildren) => {
  const { state } = useCreator();

  return (
    <section
      className="flex-grow rounded-csw-lg px-csw-2xl pb-csw-4xl max-w-full md:max-w-none w-full"
      style={{
        background: state.surfaceColor,
      }}>
      {children}
    </section>
  );
};
