import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const OwnerLayout = () => {
  return (
    <div className="flex min-h-screen bg-brand-dark">
      <Sidebar />
      <main className="flex-1 ml-64 p-6 lg:p-8 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;
