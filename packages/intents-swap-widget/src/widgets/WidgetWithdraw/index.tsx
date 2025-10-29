import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetWithdrawContent } from './WidgetWithdrawContent';

export type WidgetWithdrawProps = Props;

export const WidgetWithdraw = ({
  FooterComponent,
  isFullPage,
  ...widgetProps
}: WidgetWithdrawProps) => (
  <WidgetContainer isFullPage={isFullPage} FooterComponent={FooterComponent}>
    <WidgetWithdrawContent {...widgetProps} />
  </WidgetContainer>
);
