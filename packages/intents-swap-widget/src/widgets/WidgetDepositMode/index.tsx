import {
  WidgetContainer,
  WidgetContainerProps,
} from '../../components/WidgetContainer';
import { Props, WidgetDepositModeContent } from './WidgetDepositModeContent';

export type WidgetDepositModeProps = Props &
  Omit<WidgetContainerProps, 'children'>;

export const WidgetDepositMode = ({
  HeaderComponent,
  FooterComponent,
  isFullPage,
  className,
  ...widgetProps
}: WidgetDepositModeProps) => (
  <WidgetContainer
    className={className}
    isFullPage={isFullPage}
    HeaderComponent={HeaderComponent}
    FooterComponent={FooterComponent}>
    <WidgetDepositModeContent {...widgetProps} />
  </WidgetContainer>
);
