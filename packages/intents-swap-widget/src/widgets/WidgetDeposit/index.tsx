import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetDepositContent } from './WidgetDepositContent';

export type WidgetDepositProps = Props;

export const WidgetDeposit = ({
  FooterComponent,
  ...widgetProps
}: WidgetDepositProps) => (
  <WidgetContainer FooterComponent={FooterComponent}>
    <WidgetDepositContent {...widgetProps} />
  </WidgetContainer>
);
