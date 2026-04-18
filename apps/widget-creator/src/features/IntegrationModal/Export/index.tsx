import { useEffect, useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import { AddW700 as Add } from '@material-symbols-svg/react-rounded/icons/add';
import { ContentCopyW700 as ContentCopy } from '@material-symbols-svg/react-rounded/icons/content-copy';
import { OpenInNewW700 as OpenInNew } from '@material-symbols-svg/react-rounded/icons/open-in-new';
import { Button as UIButton } from '@headlessui/react';

import { ApiKeySelect, Header } from '../components';

import {
  useApiKeys,
  useCreateWidgetConfig,
  useCurrentWidgetConfig,
} from '@/api/hooks';
import { Button } from '@/uikit/Button';
import { useCreator } from '@/hooks/useCreatorConfig';
import { ExpandableToggleCard } from '@/uikit/ToggleCard';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { InfoBanner } from '@/components/InfoBanner';
import { useShareableLink } from '@/hooks/useShareableLink';
import { PLACEHOLDER_APP_KEY } from '@/constants';
import type { ApiKey } from '@/api/types';

const applyIndent = (code: string, spaces: number): string => {
  const pad = ' '.repeat(spaces);

  return code
    .split('\n')
    .map((line, index) => {
      if (!index) {
        return line;
      }

      return line ? pad + line : line;
    })
    .join('\n');
};

const stringifyAsJS = (value: unknown, indent: number): string => {
  const json = JSON.stringify(value, null, 2);

  // Remove quotes from valid JS identifiers
  const cleanJson = json.replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)":/g, '$1:');

  return applyIndent(cleanJson, indent);
};

type Props = {
  onClickApiKeys: () => void;
};

const useApiKeysState = () => {
  const { authenticated } = usePrivy();
  const { data: apiKeys, status } = useApiKeys();

  if (!authenticated) {
    return { state: 'unauthenticated' as const };
  }

  if (status === 'success') {
    if (apiKeys.length === 0) {
      return { state: 'no-api-keys' as const };
    }

    return {
      state: 'has-api-keys' as const,
      apiKeys: apiKeys as [ApiKey, ...ApiKey[]],
    };
  }

  return { state: status };
};

export const Export = ({ onClickApiKeys }: Props) => {
  const { login } = useLogin();
  const { dispatch, state } = useCreator();

  const apiKeysState = useApiKeysState();
  const { refetch: refetchApiKeys } = useApiKeys();
  const { data: currentWidgetConfig } = useCurrentWidgetConfig({
    enabled: true,
  });

  const { widgetConfig } = useWidgetConfig();
  const { themeConfig } = useThemeConfig();

  const createWidgetConfigMutation = useCreateWidgetConfig();
  const [embeddableLinkConfigId, setEmbeddableLinkConfigId] = useState<
    string | null
  >(null);

  const shareableLink = useShareableLink(
    embeddableLinkConfigId,
    state.apiKey ?? null,
  );

  const [copyCodeFeedback, setCopyCodeFeedback] = useState(false);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const [isCodeSnippetExpanded, setIsCodeSnippetExpanded] = useState(true);
  const [isEmbeddedLinkExpanded, setIsEmbeddedLinkExpanded] = useState(
    state.isConfigurationSyncedToRemote,
  );

  useEffect(() => {
    if (state.isConfigurationSyncedToRemote && currentWidgetConfig) {
      setEmbeddableLinkConfigId(currentWidgetConfig.uuid);
    }
  }, []);

  const handleEmbeddedLinkToggle = async (enabled: boolean) => {
    setIsEmbeddedLinkExpanded(enabled);

    if (!enabled) {
      setEmbeddableLinkConfigId(null);
      createWidgetConfigMutation.reset();

      return;
    }

    if (state.isConfigurationSyncedToRemote && currentWidgetConfig) {
      setEmbeddableLinkConfigId(currentWidgetConfig.uuid);

      return;
    }

    const { apiKey: _apiKey, ...configWithoutApiKey } = widgetConfig;

    try {
      const created = await createWidgetConfigMutation.mutateAsync({
        config: configWithoutApiKey,
        theme: themeConfig,
      });

      setEmbeddableLinkConfigId(created.uuid);
      dispatch({ type: 'SET_CONFIGURATION_SYNCED_TO_REMOTE' });
    } catch {
      // error state is reflected via createWidgetConfigMutation.status
    }
  };

  const handleCopyLink = async () => {
    if (!shareableLink) {
      return;
    }

    await navigator.clipboard.writeText(shareableLink);
    setCopyLinkFeedback(true);
    setTimeout(() => setCopyLinkFeedback(false), 2000);
  };

  const isStandaloneMode = state.userAuthMode === 'standalone';

  // we don't want to expose our default app key to the exported code
  // but want a widget to function in a studio so we swap them here
  const sampleCode = `import { Widget, WidgetConfigProvider } from '@aurora-is-near/intents-swap-widget${isStandaloneMode ? '-standalone' : ''}';

export function App() {
  return (
    <WidgetConfigProvider
      config={${stringifyAsJS({ ...widgetConfig, apiKey: state.apiKey ?? PLACEHOLDER_APP_KEY }, 6)}}
      theme={${stringifyAsJS(themeConfig, 6)}}
    >
      <Widget />
    </WidgetConfigProvider>
  );
}`;

  const handleApiKeySelect = (apiKey: string) => {
    dispatch({ type: 'SET_API_KEY', payload: apiKey });
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(sampleCode);
    setCopyCodeFeedback(true);
    setTimeout(() => setCopyCodeFeedback(false), 2000);
  };

  useEffect(() => {
    if (apiKeysState.state === 'has-api-keys') {
      handleApiKeySelect(apiKeysState.apiKeys[0].widgetApiKey);
    }
  }, [apiKeysState.state]);

  return (
    <>
      <div className="px-csw-2xl pt-csw-2xl pb-csw-xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-900">
        <Header
          title="Embed code"
          description={
            <>
              Add the Intents Widget to your app using an API key.{' '}
              <br className="hidden sm:block" />
              Your API key controls configuration, fees, and reporting for your
              integration.
            </>
          }
          warning={
            <>
              For more details, check out{' '}
              <a
                href="https://docs.intents.aurora.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-csw-xxs underline">
                Developer Quick Start
                <OpenInNew size={12} className="ml-csw-xs -mb-[3px]" />
              </a>
            </>
          }
        />
      </div>

      <div className="flex flex-col gap-csw-2xl mt-csw-2xl pb-csw-2xl">
        {(() => {
          switch (apiKeysState.state) {
            case 'unauthenticated':
              return (
                <InfoBanner
                  action="Log in"
                  title="API key required"
                  description="Log in to create an API key to activate the widget."
                  onClick={login}
                />
              );
            case 'no-api-keys':
              return (
                <InfoBanner
                  action="Go to API Keys"
                  title="API key required"
                  description="Create an API key to activate the widget, configure fees and track usage."
                  onClick={onClickApiKeys}
                />
              );
            case 'error':
              return (
                <InfoBanner
                  state="error"
                  action="Try again"
                  title="Unable to load API keys"
                  description="We couldn't load your API keys. Please try again."
                  onClick={refetchApiKeys}
                />
              );

            case 'has-api-keys': {
              const apiKeySelected =
                state.apiKey ?? apiKeysState.apiKeys[0].widgetApiKey;

              return (
                <div className="flex flex-col gap-csw-md">
                  <header className="flex items-center justify-between">
                    <span className="text-csw-label-md text-csw-gray-50">
                      API key
                    </span>
                    <UIButton
                      className="flex items-center gap-csw-xs cursor-pointer transition-colors group"
                      onClick={onClickApiKeys}>
                      <Add
                        size={18}
                        className="text-csw-gray-300 group-hover:text-csw-gray-50 transition-colors"
                      />
                      <span className="text-csw-label-md text-csw-gray-300 group-hover:text-csw-gray-50 transition-colors">
                        Create API key
                      </span>
                    </UIButton>
                  </header>

                  {apiKeySelected ? (
                    <ApiKeySelect
                      keys={apiKeysState.apiKeys.map(
                        (apiKey) => apiKey.widgetApiKey,
                      )}
                      selected={apiKeySelected}
                      onChange={handleApiKeySelect}
                    />
                  ) : (
                    <div className="w-full rounded-csw-md bg-csw-gray-800 h-[44px] animate-pulse" />
                  )}
                </div>
              );
            }

            case 'pending':
            default:
              return <InfoBanner.Skeleton />;
          }
        })()}

        <ExpandableToggleCard
          label="Generate a new link to embed"
          isExpanded={isEmbeddedLinkExpanded}
          onToggle={handleEmbeddedLinkToggle}
          description={
            <>
              Integrate the widget with one line into any application using an
              iframe. <br className="hidden sm:block" />
              No code needed, non React apps are supported.
            </>
          }>
          <div className="flex flex-col gap-csw-xl">
            {(createWidgetConfigMutation.status === 'pending' ||
              !shareableLink) && (
              <div className="w-full rounded-csw-md bg-csw-gray-800 h-[44px] animate-pulse" />
            )}
            {(createWidgetConfigMutation.status === 'success' ||
              (state.isConfigurationSyncedToRemote && currentWidgetConfig)) &&
              shareableLink !== null && (
                <div className="flex items-center gap-csw-sm h-[36px]">
                  <div className="flex items-center bg-csw-gray-800 rounded-csw-md px-csw-lg overflow-hidden flex-1 h-full">
                    <span className="text-csw-body-sm text-csw-gray-300 truncate">
                      {shareableLink}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    detail="accent"
                    size="sm"
                    fluid
                    icon={ContentCopy}
                    className="h-full shrink-0"
                    onClick={handleCopyLink}>
                    {copyLinkFeedback ? 'Copied!' : 'Copy link'}
                  </Button>
                </div>
              )}
            {createWidgetConfigMutation.status === 'error' && (
              <InfoBanner
                state="error"
                action="Try again"
                title="Unable to generate link"
                description="We couldn't create the shareable config. Please try again."
                onClick={handleEmbeddedLinkToggle.bind(null, true)}
              />
            )}
          </div>
        </ExpandableToggleCard>

        <ExpandableToggleCard
          label="Use React code snippet"
          isExpanded={isCodeSnippetExpanded}
          onToggle={setIsCodeSnippetExpanded}
          description={
            <>
              Code snippet to be paste into your app's source code.{' '}
              <br className="hidden sm:block" />
              You can extend your config and have full control over the widget.
            </>
          }>
          <Button
            variant="primary"
            detail="accent"
            size="sm"
            fluid
            icon={ContentCopy}
            className="w-full mb-csw-2xl"
            onClick={handleCopyCode}>
            {copyCodeFeedback ? 'Copied!' : 'Copy code'}
          </Button>
          <div className="overflow-y-auto flex-shrink-1 min-h-[380px] pb-csw-2xl w-full">
            <div className="bg-csw-gray-900 px-csw-2xl py-csw-md rounded-csw-md h-full overflow-auto max-h-[50dvh]">
              <span className="text-csw-label-md text-csw-gray-50">React</span>
              <hr className="border-csw-gray-800 my-csw-md pb-csw-lg" />
              <Highlight
                theme={themes.dracula}
                code={sampleCode}
                language="tsx">
                {({ tokens, getLineProps, getTokenProps }) => (
                  <pre className="font-normal text-sm leading-[1.3em] text-csw-gray-50 m-0 p-0 table w-full">
                    {tokens.map((line, i) => {
                      const {
                        style: lineStyle,
                        className: lineClassName,
                        ...lineOtherProps
                      } = getLineProps({
                        line,
                      });

                      return (
                        <div
                          key={i}
                          className={`table-row ${lineClassName || ''}`}
                          style={lineStyle as React.CSSProperties}
                          {...lineOtherProps}>
                          <span className="table-cell text-right pr-csw-lg select-none opacity-50 text-csw-gray-400">
                            {i + 1}
                          </span>
                          <span className="table-cell">
                            {line.map((token, key) => {
                              const {
                                style: tokenStyle,
                                className: tokenClassName,
                                ...tokenOtherProps
                              } = getTokenProps({ token });

                              return (
                                <span
                                  key={key}
                                  className={tokenClassName || ''}
                                  style={tokenStyle as React.CSSProperties}
                                  {...tokenOtherProps}
                                />
                              );
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </pre>
                )}
              </Highlight>
            </div>
          </div>
        </ExpandableToggleCard>
      </div>
    </>
  );
};
