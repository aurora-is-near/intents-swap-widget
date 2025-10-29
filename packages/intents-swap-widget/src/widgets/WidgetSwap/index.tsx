import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetSwapContent } from './WidgetSwapContent';

export type WidgetSwapProps = Props;

export const WidgetSwap = ({
  FooterComponent,
  isFullPage,
  ...widgetProps
}: WidgetSwapProps) => (
  <WidgetContainer isFullPage={isFullPage} FooterComponent={FooterComponent}>
    <WidgetSwapContent {...widgetProps} />
  </WidgetContainer>
);
