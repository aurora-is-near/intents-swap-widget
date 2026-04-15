import { useLayoutEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { BlockingError } from '@aurora-is-near/intents-swap-widget';

import { CreatorProvider, QueryProvider } from './providers';
import { IntegrationModal } from './features/IntegrationModal';
import { useApplyRemoteWidgetConfig } from './hooks/useApplyRemoteWidgetConfig';
import { useSyncRemoteWidgetConfig } from './hooks/useSyncRemoteWidgetConfig';

import { Menu } from './components/Menu';
import { Header } from './components/Header';
import { CreatorPanel } from './components/creatorPanel/CreatorPanel';
import { WidgetSection } from './components/widget/WidgetSection';
import { WidgetContent } from './components/widget/WidgetContent';
import { useCreator } from './hooks/useCreatorConfig';

import { useGetWidgetConfig } from '@/api/hooks';

const getEmbedParamValue = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get('embed');
};

const getConfigIdParamValue = (param: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);

  return searchParams.get(param);
};

const AppContent = () => {
  const { dispatch } = useCreator();
  const configId = getConfigIdParamValue('configId');
  const apiKey = getConfigIdParamValue('apiKey');
  const isConfigIdMode = Boolean(configId);

  const appliedConfigIdRef = useRef<string | null>(null);

  useSyncRemoteWidgetConfig({ enabled: !isConfigIdMode });
  const { isRemoteWidgetConfigLoading } = useApplyRemoteWidgetConfig({
    enabled: !isConfigIdMode,
  });

  const {
    data: publicWidgetConfig,
    error: publicWidgetConfigError,
    status: publicWidgetConfigStatus,
  } = useGetWidgetConfig(configId);

  useLayoutEffect(() => {
    if (publicWidgetConfigStatus !== 'success' || !publicWidgetConfig) {
      return;
    }

    if (appliedConfigIdRef.current === publicWidgetConfig.uuid) {
      return;
    }

    dispatch({
      type: 'APPLY_REMOTE_WIDGET_CONFIG',
      payload: {
        config: publicWidgetConfig.config,
        theme: publicWidgetConfig.theme,
      },
    });

    appliedConfigIdRef.current = publicWidgetConfig.uuid;
  }, [dispatch, publicWidgetConfig, publicWidgetConfigStatus]);

  const { ready } = usePrivy();
  const isRemoteConfigLoading = isConfigIdMode
    ? publicWidgetConfigStatus === 'pending'
    : !ready || isRemoteWidgetConfigLoading;

  const isEmbedded = getEmbedParamValue();
  const widgetConfigLoadError = isConfigIdMode ? publicWidgetConfigError : null;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const openExportModal = () => {
    setIsDrawerOpen(false);
    setIsExportModalOpen(true);
  };

  if (isEmbedded && isRemoteConfigLoading) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        <div className="max-w-[496px] w-full p-csw-2xl gap-csw-lg relative flex flex-col">
          <div className="gap-csw-lg relative flex flex-col">
            <div className="animate-pulse rounded-csw-lg bg-csw-gray-800 h-[165px]" />
            <div className="animate-pulse rounded-csw-lg bg-csw-gray-800 h-[165px]" />
          </div>
          <div className="gap-csw-lg relative flex flex-col">
            <div className="animate-pulse rounded-csw-lg bg-csw-gray-800 h-[44px]" />
            <div className="animate-pulse rounded-csw-lg bg-csw-gray-800 h-[48px]" />
          </div>
        </div>
      </div>
    );
  }

  if (isEmbedded) {
    if (!apiKey) {
      return (
        <WidgetSection isEmbedded>
          <div className="sw w-full max-w-[456px] px-csw-2xl">
            <BlockingError message="API key is required." />
          </div>
        </WidgetSection>
      );
    }

    if (widgetConfigLoadError) {
      return (
        <WidgetSection isEmbedded>
          <BlockingError message="Couldn't load widget configuration." />
        </WidgetSection>
      );
    }

    return (
      <WidgetSection isEmbedded>
        <WidgetContent />
      </WidgetSection>
    );
  }

  if (isRemoteConfigLoading) {
    return (
      <main className="flex flex-col py-csw-2xl sm:p-csw-2xl relative sm:h-full lg:max-h-screen lg:overflow-hidden bg-[#1D1E24] min-h-full">
        <Header
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenExportModal={openExportModal}
        />
        <div className="flex items-center lg:items-stretch flex-grow mt-csw-2xl gap-csw-2xl flex-col lg:flex-row lg:h-[calc(100%-62px)]">
          <WidgetSection>
            <aside className="mt-csw-2xl sm:mt-csw-10xl m-auto sw w-full max-w-[456px] sm:w-[456px]">
              <div className="w-full gap-csw-lg relative flex flex-col">
                <div className="gap-csw-lg relative flex flex-col">
                  <div className="animate-pulse rounded-csw-lg bg-csw-gray-800 h-[165px]" />
                  <div className="animate-pulse rounded-csw-lg bg-csw-gray-800 h-[165px]" />
                </div>
                <div className="gap-csw-lg relative flex flex-col">
                  <div className="animate-pulse rounded-csw-lg bg-csw-gray-800 h-[44px]" />
                  <div className="animate-pulse rounded-csw-lg bg-csw-gray-800 h-[48px]" />
                </div>
              </div>
            </aside>
          </WidgetSection>
          <section className="hidden lg:flex bg-csw-gray-950 rounded-csw-lg max-w-full w-full lg:max-w-[455px] lg:w-full lg:h-full">
            <div className="flex flex-col px-csw-2xl sm:pt-[22px] pb-csw-2xl overflow-y-auto custom-scrollbar custom-scrollbar-offset-2xl h-full w-full gap-[22px]">
              <div className="bg-csw-gray-800 animate-pulse rounded-csw-md w-full h-[38px]" />
              <div className="bg-csw-gray-800 animate-pulse rounded-csw-md w-full h-[274px]" />
              <div className="bg-csw-gray-800 animate-pulse rounded-csw-md w-full h-[380px]" />
              <div className="bg-csw-gray-800 animate-pulse rounded-csw-md w-full h-[324px]" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-col py-csw-2xl sm:p-csw-2xl relative sm:h-full lg:max-h-screen lg:overflow-hidden bg-[#1D1E24] min-h-full">
        <Header
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenExportModal={openExportModal}
        />
        <div className="flex items-center lg:items-stretch flex-grow mt-csw-2xl gap-csw-2xl flex-col lg:flex-row lg:h-[calc(100%-62px)]">
          <WidgetSection>
            <aside className="mt-csw-2xl sm:mt-csw-10xl m-auto sw w-full lg:w-auto">
              {widgetConfigLoadError ? (
                <div className="w-full max-w-[456px] sm:w-[456px]">
                  <BlockingError message="Couldn't load widget configuration." />
                </div>
              ) : (
                <WidgetContent />
              )}
            </aside>
          </WidgetSection>
          <section className="hidden lg:flex bg-csw-gray-950 rounded-csw-lg max-w-full w-full lg:max-w-[455px] lg:w-full lg:h-full">
            <CreatorPanel />
          </section>
        </div>
      </main>
      <Menu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenExportModal={openExportModal}
      />
      <IntegrationModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
};

function App() {
  return (
    <QueryProvider>
      <CreatorProvider>
        <AppContent />
      </CreatorProvider>
    </QueryProvider>
  );
}

export default App;
