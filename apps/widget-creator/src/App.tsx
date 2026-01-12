import { Header } from './components/Header';
import { CreatorPanel } from './components/creatorPanel/CreatorPanel';
import { Widget } from './components/widget/Widget';
import { CreatorProvider, QueryProvider } from './providers';
import { WidgetSection } from './components/widget/WidgetSection';

function App() {
  return (
    <QueryProvider>
      <CreatorProvider>
        <main className="flex flex-col gap-4 p-4 h-full p-csw-2xl relative">
          <Header />
          <div className="flex-1 flex items-center md:items-stretch flex-grow mt-csw-2xl gap-csw-2xl flex-col md:flex-row">
            <WidgetSection>
              <aside className="mt-csw-10xl m-auto sw">
                <Widget />
              </aside>
            </WidgetSection>
            <section className="flex-grow bg-csw-gray-950 rounded-csw-lg max-w-full w-full md:max-w-[455px] md:w-full">
              <CreatorPanel />
            </section>
          </div>
        </main>
      </CreatorProvider>
    </QueryProvider>
  );
}

export default App;
