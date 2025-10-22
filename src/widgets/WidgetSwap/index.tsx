import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetSwapContent } from './WidgetSwapContent';

export type WidgetSwapProps = Props;

export const WidgetSwap = (props: WidgetSwapProps) => (
  <WidgetContainer>
    <WidgetSwapContent {...props} />
  </WidgetContainer>
);
