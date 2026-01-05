import { useCreator } from '../../hooks/useCreatorConfig';
import { PropsWithChildren } from 'react';

export const WidgetSection = ({ children }: PropsWithChildren) => {
  const { state } = useCreator();

  return (
    <section
      className="flex-grow rounded-csw-lg px-csw-2xl pb-csw-4xl max-w-full md:max-w-none w-full"
      style={{
        background: state.backgroundColor,
      }}>
      {children}
    </section>
  );
}
