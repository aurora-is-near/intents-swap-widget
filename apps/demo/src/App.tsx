import { Outlet, Route, Routes } from 'react-router-dom';

import { TabbedWidgetsDemo } from './TabbedWidgetsDemo';
import { SimpleWidgetDemo } from './SimpleWidgetDemo';

export const App = () => {
  return (
    <Routes>
      <Route element={<Outlet />}>
        <Route path="/" element={<SimpleWidgetDemo />} />
        <Route path="/tabs" element={<TabbedWidgetsDemo />} />
        <Route path="*" element={<SimpleWidgetDemo />} />
      </Route>
    </Routes>
  );
};
