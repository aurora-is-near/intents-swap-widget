import { useState } from 'react';
import { Header } from './components/Header';
import { CreatorPanel } from './components/creatorPanel/CreatorPanel';
import { WidgetSection } from './components/widget/WidgetSection';
import { WidgetContent } from './components/widget/WidgetContent';
import { Menu } from './components/Menu';
import { IntegrationModal } from './features/IntegrationModal';
import { CreatorProvider, QueryProvider } from './providers';

function App() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const openExportModal = () => {
    setIsDrawerOpen(false);
    setIsExportModalOpen(true);
  };

  return (
    <QueryProvider>
      <CreatorProvider>
        <main className="flex flex-col py-csw-2xl sm:p-csw-2xl relative sm:h-full md:max-h-screen md:overflow-hidden bg-[#1D1E24] min-h-full">
          <Header
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onOpenExportModal={openExportModal}
          />
          <div className="flex items-center md:items-stretch flex-grow mt-csw-2xl gap-csw-2xl flex-col md:flex-row md:h-[calc(100%-62px)]">
            <WidgetSection>
              <aside className="mt-csw-2xl sm:mt-csw-10xl m-auto sw">
                <WidgetContent />
              </aside>
            </WidgetSection>
            <section className="hidden md:flex bg-csw-gray-950 rounded-csw-lg max-w-full w-full md:max-w-[455px] md:w-full md:h-full">
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
      </CreatorProvider>
    </QueryProvider>
  );
}

export default App;
