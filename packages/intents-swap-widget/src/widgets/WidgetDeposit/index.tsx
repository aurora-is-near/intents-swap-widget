import { BaseContainer } from '../../components/BaseContainer';
import {
  WidgetContainer,
  WidgetContainerProps,
} from '../../components/WidgetContainer';
import { Props, WidgetDepositContent } from './WidgetDepositContent';

export type WidgetDepositProps = Props & Omit<WidgetContainerProps, 'children'>;

export const WidgetDeposit = ({
  HeaderComponent,
  FooterComponent,
  isFullPage,
  className,
  ...widgetProps
}: WidgetDepositProps) => (
  <BaseContainer>
    <WidgetContainer
      className={className}
      isFullPage={isFullPage}
      HeaderComponent={HeaderComponent}
      FooterComponent={FooterComponent}>
      <WidgetDepositContent {...widgetProps} />
    </WidgetContainer>
  </BaseContainer>
);
