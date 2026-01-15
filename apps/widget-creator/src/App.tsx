import { Header } from './components/Header';
import { CreatorPanel } from './components/creatorPanel/CreatorPanel';
import { WidgetSection } from './components/widget/WidgetSection';
import { WidgetContent } from './components/widget/WidgetContent';
import { CreatorProvider, QueryProvider } from './providers';

function App() {
  return (
    <QueryProvider>
      <CreatorProvider>
        <main className="flex flex-col gap-4 p-4 h-full p-csw-2xl relative md:max-h-screen md:overflow-hidden">
          <Header />
          <div className="flex items-center md:items-stretch flex-grow mt-csw-2xl gap-csw-2xl flex-col md:flex-row md:h-[calc(100%-62px)]">
            <WidgetSection>
              <aside className="mt-csw-10xl m-auto sw">
                <WidgetContent />
              </aside>
            </WidgetSection>
            <section className="flex-grow bg-csw-gray-950 rounded-csw-lg max-w-full w-full md:max-w-[455px] md:w-full overflow-y-auto md:h-full">
              <CreatorPanel />
            </section>
          </div>
        </main>
      </CreatorProvider>
    </QueryProvider>
  );
}

export default App;
