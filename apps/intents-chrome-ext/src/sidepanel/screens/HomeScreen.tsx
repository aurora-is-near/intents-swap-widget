import { ChevronRightW700 as ChevronRight } from '@material-symbols-svg/react-rounded/icons/chevron-right';

import { Badge, Card } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { ScreenHeader } from '../components/ScreenHeader';
import { INTEGRATIONS } from '../integrations/registry';
import type { IntegrationId } from '../integrations/registry';

type Props = {
  activeUrl: string | undefined;
  onOpen: (id: IntegrationId) => void;
};

export const HomeScreen = ({ activeUrl, onOpen }: Props) => (
  <div className="flex flex-col gap-sw-xl">
    <ScreenHeader title="Intents Connect" />
    <p className="text-sw-body-md text-sw-gray-300">
      Deposit into supported apps from any chain. Pick an integration, or open
      its site to jump straight in.
    </p>

    <ul className="flex flex-col gap-sw-md">
      {INTEGRATIONS.map((integration) => {
        const isCurrent = integration.matchUrl(activeUrl);

        return (
          <li key={integration.id}>
            <Card
              isClickable
              className={cn(
                'flex items-center gap-sw-lg border border-transparent hover:bg-sw-gray-800',
                { 'border-sw-accent-500 bg-sw-gray-800': isCurrent },
              )}
              onClick={() => onOpen(integration.id)}>
              <span
                aria-hidden
                className="flex items-center justify-center shrink-0 w-sw-5xl h-sw-5xl rounded-sw-md text-sw-label-lg text-sw-gray-50"
                style={{ backgroundColor: integration.accent }}>
                {integration.name[0]}
              </span>
              <span className="flex flex-col gap-sw-xxs grow min-w-0">
                <span className="flex items-center gap-sw-md">
                  <span className="text-sw-label-lg text-sw-gray-50">
                    {integration.name}
                  </span>
                  {isCurrent && <Badge className="ml-0">Current site</Badge>}
                </span>
                <span className="text-sw-body-sm text-sw-gray-400">
                  {integration.description}
                </span>
              </span>
              <ChevronRight className="w-sw-xl h-sw-xl shrink-0 text-sw-gray-400" />
            </Card>
          </li>
        );
      })}
    </ul>
  </div>
);
