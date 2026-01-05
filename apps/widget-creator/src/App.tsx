import { useState } from 'react';
import { Header } from './components/Header';
import { CreatorPanel } from './components/creatorPanel/CreatorPanel';
import { Widget } from './components/widget/Widget';
import { CreatorProvider, QueryProvider } from './providers';
import { ResolutionHeader } from './components/widget/ResolutionHeader';
import { cn } from './utils/cn';
import { WidgetSection } from './components/widget/WidgetSection';

function App() {
  const [resolutionView, setResolutionView] = useState<'desktop' | 'mobile'>(
    'desktop',
  );

  return (
    <QueryProvider>
      <CreatorProvider>
        <main className="flex flex-col gap-4 p-4 h-full p-csw-2xl relative">
          <Header />
          <div
            className={cn(
              'flex-1 flex items-center md:items-stretch flex-grow mt-csw-2xl gap-csw-2xl',
              resolutionView === 'mobile'
                ? 'flex-col md:items-center'
                : 'flex-col md:flex-row',
            )}>
            <WidgetSection>
              <ResolutionHeader
                setResolutionView={setResolutionView}
                resolutionView={resolutionView}
              />
              <aside className="mt-[46px] max-w-[420px] m-auto sw">
                <Widget />
              </aside>
            </WidgetSection>
            <section
              className={cn(
                'flex-grow bg-csw-gray-950 rounded-csw-lg',
                resolutionView === 'mobile'
                  ? 'max-w-full w-full'
                  : 'max-w-full w-full md:max-w-[455px] md:w-full',
              )}>
              <CreatorPanel />
            </section>
          </div>
        </main>
      </CreatorProvider>
    </QueryProvider>
  );
}

export default App;
