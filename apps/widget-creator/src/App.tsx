import { useState } from 'react';
import { Header } from './components/Header';
import { CreatorPanel } from './components/creatorPanel/CreatorPanel';
import { Widget } from './components/widget/Widget';
import { CreatorProvider, QueryProvider } from './providers';
import { ResolutionHeader } from './components/widget/ResolutionHeader';
import { cn } from './utils/cn';

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
            <section className="flex-grow bg-csw-gray-950 rounded-csw-lg px-csw-2xl pb-csw-4xl max-w-full md:max-w-none w-full">
              <ResolutionHeader
                setResolutionView={setResolutionView}
                resolutionView={resolutionView}
              />
              <aside className="mt-[46px] max-w-fit m-auto sw">
                <Widget />
              </aside>
            </section>
            <section
              className={cn(
                ' flex-grow bg-csw-gray-950 rounded-csw-lg',
                resolutionView === 'mobile'
                  ? 'max-w-full w-full'
                  : 'max-w-[455px] w-full',
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
