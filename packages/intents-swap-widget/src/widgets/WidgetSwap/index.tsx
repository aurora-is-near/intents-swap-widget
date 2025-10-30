import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetSwapContent } from './WidgetSwapContent';

export type WidgetSwapProps = Props;

export const WidgetSwap = ({
  HeaderComponent,
  FooterComponent,
  isFullPage,
  ...widgetProps
}: WidgetSwapProps) => (
  <WidgetContainer
    isFullPage={isFullPage}
    HeaderComponent={HeaderComponent}
    FooterComponent={FooterComponent}>
    <WidgetSwapContent {...widgetProps} />
  </WidgetContainer>
);
