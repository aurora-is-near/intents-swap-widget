import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetDepositContent } from './WidgetDepositContent';

export type WidgetDepositProps = Props;

export const WidgetDeposit = (props: WidgetDepositProps) => (
  <WidgetContainer>
    <WidgetDepositContent {...props} />
  </WidgetContainer>
);
