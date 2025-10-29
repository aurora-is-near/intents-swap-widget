import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetDepositContent } from './WidgetDepositContent';

export type WidgetDepositProps = Props;

export const WidgetDeposit = ({
  FooterComponent,
  isFullPage,
  ...widgetProps
}: WidgetDepositProps) => (
  <WidgetContainer isFullPage={isFullPage} FooterComponent={FooterComponent}>
    <WidgetDepositContent {...widgetProps} />
  </WidgetContainer>
);
