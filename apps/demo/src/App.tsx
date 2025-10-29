import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { TabbedWidgetsDemo } from './TabbedWidgetsDemo';
import { NotFound } from './NotFound';
import { SimpleWidgetDemo } from './SimpleWidgetDemo';

export const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<SimpleWidgetDemo />} />
        <Route path="/tabs" element={<TabbedWidgetsDemo />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};
