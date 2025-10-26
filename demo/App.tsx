import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { TonWidgetDemo } from './TonWidgetDemo';
import { TabbedWidgetsDemo } from './TabbedWidgetsDemo';
import { NotFound } from './NotFound';

export const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<TabbedWidgetsDemo />} />
        <Route path="/ton" element={<TonWidgetDemo />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};
