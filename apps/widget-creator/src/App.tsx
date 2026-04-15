import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

import { CreatorProvider, QueryProvider } from './providers';
import { IntegrationModal } from './features/IntegrationModal';
import { useApplyRemoteWidgetConfig } from './hooks/useApplyRemoteWidgetConfig';
import { useSyncRemoteWidgetConfig } from './hooks/useSyncRemoteWidgetConfig';

import { Menu } from './components/Menu';
import { Header } from './components/Header';
import { CreatorPanel } from './components/creatorPanel/CreatorPanel';
import { WidgetSection } from './components/widget/WidgetSection';
import { WidgetContent } from './components/widget/WidgetContent';

const getEmbedParamValue = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get('embed');
};

const AppContent = () => {
  useSyncRemoteWidgetConfig();
  const { isRemoteWidgetConfigLoading } = useApplyRemoteWidgetConfig();

  const { ready } = usePrivy();
  const isRemoteConfigLoading = !ready || isRemoteWidgetConfigLoading;
  const isEmbedded = getEmbedParamValue();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const openExportModal = () => {
    setIsDrawerOpen(false);
    setIsExportModalOpen(true);
  };

  if (isEmbedded && isRemoteConfigLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
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
      </div>
    );
  }

  if (isEmbedded) {
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
              <WidgetContent />
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
