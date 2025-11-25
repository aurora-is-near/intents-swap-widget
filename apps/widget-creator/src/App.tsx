import { Header } from './components/Header';
import { CreatorPanel } from './components/creatorPanel/CreatorPanel';
import { Widget } from './components/widget/Widget';
import { CreatorProvider } from './providers';
import '@aurora-is-near/intents-swap-widget/styles.css';

function App() {
  return (
    <CreatorProvider>
      <main className="flex flex-col gap-4 p-4 h-full p-sw-2xl">
        <Header />
        <div className="flex-1 flex flex-grow mt-sw-2xl gap-sw-2xl">
          <section className="flex-grow bg-sw-gray-950 rounded-sw-lg">
            <aside className="mt-[46px] sw">
              <Widget />
            </aside>
          </section>
          <section className="max-w-[455px] w-full flex-grow bg-sw-gray-950 rounded-sw-lg">
            <CreatorPanel />
          </section>
        </div>
      </main>
    </CreatorProvider>
  );
}

export default App;
