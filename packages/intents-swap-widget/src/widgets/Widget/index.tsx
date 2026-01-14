import {
  WidgetContainer,
  WidgetContainerProps,
} from '../../components/WidgetContainer';
import { Props, WidgetContent } from './WidgetContent';

export type WidgetProps = Props & Omit<WidgetContainerProps, 'children'>;

export const Widget = ({
  HeaderComponent,
  FooterComponent,
  isFullPage,
  className,
  ...widgetProps
}: WidgetProps) => (
  <WidgetContainer
    className={className}
    isFullPage={isFullPage}
    HeaderComponent={HeaderComponent}
    FooterComponent={FooterComponent}>
    <WidgetContent {...widgetProps} />
  </WidgetContainer>
);
