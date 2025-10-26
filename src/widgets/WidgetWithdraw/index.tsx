import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetWithdrawContent } from './WidgetWithdrawContent';

export type WidgetWithdrawProps = Props;

export const WidgetWithdraw = (props: WidgetWithdrawProps) => (
  <WidgetContainer>
    <WidgetWithdrawContent {...props} />
  </WidgetContainer>
);
