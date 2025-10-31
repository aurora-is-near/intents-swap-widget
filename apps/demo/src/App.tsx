import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { TabbedWidgetsDemo } from './TabbedWidgetsDemo';
import { NotFound } from './NotFound';
import { SimpleWidgetDemo } from './SimpleWidgetDemo';
import { NearWidgetDemo } from './NearWidgetDemo';

export const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<SimpleWidgetDemo />} />
        <Route path="/tabs" element={<TabbedWidgetsDemo />} />
        <Route path="/near" element={<NearWidgetDemo />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};
