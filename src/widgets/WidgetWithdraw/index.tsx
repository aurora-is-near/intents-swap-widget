import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetWithdrawContent } from './WidgetWithdrawContent';

export type WidgetWithdrawProps = Props;

export const WidgetWithdraw = ({
  FooterComponent,
  ...widgetProps
}: WidgetWithdrawProps) => (
  <WidgetContainer FooterComponent={FooterComponent}>
    <WidgetWithdrawContent {...widgetProps} />
  </WidgetContainer>
);
