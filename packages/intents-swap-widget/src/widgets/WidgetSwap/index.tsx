import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetSwapContent } from './WidgetSwapContent';

export type WidgetSwapProps = Props;

export const WidgetSwap = ({
  FooterComponent,
  ...widgetProps
}: WidgetSwapProps) => (
  <WidgetContainer FooterComponent={FooterComponent}>
    <WidgetSwapContent {...widgetProps} />
  </WidgetContainer>
);
