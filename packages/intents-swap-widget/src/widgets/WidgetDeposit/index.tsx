import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetDepositContent } from './WidgetDepositContent';

export type WidgetDepositProps = Props;

export const WidgetDeposit = ({
  HeaderComponent,
  FooterComponent,
  isFullPage,
  ...widgetProps
}: WidgetDepositProps) => (
  <WidgetContainer
    isFullPage={isFullPage}
    HeaderComponent={HeaderComponent}
    FooterComponent={FooterComponent}>
    <WidgetDepositContent {...widgetProps} />
  </WidgetContainer>
);
