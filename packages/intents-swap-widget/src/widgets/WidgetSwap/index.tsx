import { BaseContainer } from '../../components/BaseContainer';
import {
  WidgetContainer,
  WidgetContainerProps,
} from '../../components/WidgetContainer';
import { Props, WidgetSwapContent } from './WidgetSwapContent';

export type WidgetSwapProps = Props & Omit<WidgetContainerProps, 'children'>;

export const WidgetSwap = ({
  HeaderComponent,
  FooterComponent,
  isFullPage,
  className,
  ...widgetProps
}: WidgetSwapProps) => (
  <BaseContainer>
    <WidgetContainer
      className={className}
      isFullPage={isFullPage}
      HeaderComponent={HeaderComponent}
      FooterComponent={FooterComponent}>
      <WidgetSwapContent {...widgetProps} />
    </WidgetContainer>
  </BaseContainer>
);
