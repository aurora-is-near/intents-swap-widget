import { Outlet } from 'react-router-dom';

export const Layout = () => {
  return (
    <div className="demo-page-wrapper">
      <Outlet />
    </div>
  );
};
