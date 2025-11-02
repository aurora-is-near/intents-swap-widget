import { WidgetContainer } from '../../components/WidgetContainer';
import { Props, WidgetWithdrawContent } from './WidgetWithdrawContent';

export type WidgetWithdrawProps = Props;

export const WidgetWithdraw = ({
  HeaderComponent,
  FooterComponent,
  isFullPage,
  ...widgetProps
}: WidgetWithdrawProps) => (
  <WidgetContainer
    isFullPage={isFullPage}
    HeaderComponent={HeaderComponent}
    FooterComponent={FooterComponent}>
    <WidgetWithdrawContent {...widgetProps} />
  </WidgetContainer>
);
