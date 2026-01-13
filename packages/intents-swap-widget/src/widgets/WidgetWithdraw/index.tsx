import {
  WidgetContainer,
  WidgetContainerProps,
} from '../../components/WidgetContainer';
import { Props, WidgetWithdrawContent } from './WidgetWithdrawContent';

export type WidgetWithdrawProps = Props &
  Omit<WidgetContainerProps, 'children'>;

export const WidgetWithdraw = ({
  HeaderComponent,
  FooterComponent,
  isFullPage,
  className,
  ...widgetProps
}: WidgetWithdrawProps) => (
  <WidgetContainer
    className={className}
    isFullPage={isFullPage}
    HeaderComponent={HeaderComponent}
    FooterComponent={FooterComponent}>
    <WidgetWithdrawContent {...widgetProps} />
  </WidgetContainer>
);
