import { Header } from './components/Header';
import { CreatorPanel } from './components/creatorPanel/CreatorPanel';
import { Widget } from './components/widget/Widget';
import { CreatorProvider, QueryProvider } from './providers';
import '@aurora-is-near/intents-swap-widget/styles.css';

function App() {
  return (
    <QueryProvider>
      <CreatorProvider>
        <main className="flex flex-col gap-4 p-4 h-full p-csw-2xl relative">
          <Header />
          <div className="flex-1 flex flex-col md:flex-row items-center md:items-stretch flex-grow mt-csw-2xl gap-csw-2xl">
            <section className="flex-grow bg-csw-gray-950 rounded-csw-lg p-csw-2xl max-w-[455px] md:max-w-none w-full">
              <aside className="mt-[46px] max-w-fit m-auto sw">
                <Widget />
              </aside>
            </section>
            <section className="max-w-[455px] w-full flex-grow bg-csw-gray-950 rounded-csw-lg">
              <CreatorPanel />
            </section>
          </div>
        </main>
      </CreatorProvider>
    </QueryProvider>
  );
}

export default App;
