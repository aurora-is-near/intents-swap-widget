import { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { ContentCopyW700 as ContentCopy } from '@material-symbols-svg/react-rounded/icons/content-copy';
import { OpenInNewW700 as OpenInNew } from '@material-symbols-svg/react-rounded/icons/open-in-new';
import { EmergencyFillW700 as Emergency } from '@material-symbols-svg/react-rounded/icons/emergency';
import { LinkW700 as Link } from '@material-symbols-svg/react-rounded/icons/link';

import { Button } from '@/uikit/Button';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { InfoBanner } from '@/components/InfoBanner';

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

export function Export() {
  const { widgetConfig } = useWidgetConfig();
  const { themeConfig } = useThemeConfig();
  const [copyCodeFeedback, setCopyCodeFeedback] = useState(false);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);

  const sampleCode = `import { WidgetSwap } from '@aurora-is-near/intents-swap-widget';

export function App() {
  return (
    <Widget
      config={${stringifyAsJS(widgetConfig, 6)}}
      theme={${stringifyAsJS(themeConfig, 6)}}
    />
  );
}`;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(sampleCode);
    setCopyCodeFeedback(true);
    setTimeout(() => setCopyCodeFeedback(false), 2000);
  };

  const handleCopyConfigLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopyLinkFeedback(true);
    setTimeout(() => setCopyLinkFeedback(false), 2000);
  };

  return (
    <>
      <div className="px-csw-2xl pt-csw-2xl pb-csw-xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-900">
        <div className="flex flex-col gap-csw-lg flex-1 pt-csw-md">
          <h2 className="text-csw-label-lg text-csw-gray-50">Embed code</h2>
          <p className="text-csw-body-md text-csw-gray-200">
            Add the Intents Studio widget to your app using an API key.{' '}
            <br className="hidden sm:block" />
            The selected API key determines the applied fees.
          </p>

          <div className="flex items-center gap-csw-xxs">
            <Emergency
              size={16}
              className="text-csw-status-warning mr-csw-xs"
            />
            <p className="text-csw-body-sm text-csw-status-warning inline">
              For more information, check out{' '}
              <a
                href="https://aurora-labs.gitbook.io/intents-swap-widget"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-csw-xxs underline">
                Developer quick guide
                <OpenInNew size={12} className="ml-csw-xs -mb-[3px]" />
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-csw-2xl mt-csw-2xl">
        <InfoBanner
          action="Go to API Keys"
          title="API key required"
          description="Create an API key to activate the widget."
          onClick={handleCopyConfigLink}
        />

        <div className="overflow-y-auto flex-shrink-1 min-h-[380px] pb-csw-2xl w-full">
          <div className="bg-csw-gray-900 px-csw-2xl py-csw-md rounded-csw-md h-full overflow-auto max-h-[50dvh]">
            <span className="text-csw-label-md text-csw-gray-50">React</span>
            <hr className="border-csw-gray-800 my-csw-md pb-csw-lg" />
            <Highlight theme={themes.dracula} code={sampleCode} language="tsx">
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
      </div>

      <div className="border-t border-csw-gray-900 py-csw-2xl flex items-center gap-csw-lg">
        <Button
          variant="primary"
          detail="dimmed"
          size="sm"
          fluid
          icon={Link}
          className="w-full"
          onClick={handleCopyConfigLink}>
          {copyLinkFeedback ? 'Copied!' : 'Copy config link'}
        </Button>
        <Button
          variant="primary"
          detail="accent"
          size="sm"
          fluid
          icon={ContentCopy}
          className="w-full"
          onClick={handleCopyCode}>
          {copyCodeFeedback ? 'Copied!' : 'Copy code'}
        </Button>
      </div>
    </>
  );
}
