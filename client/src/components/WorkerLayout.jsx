import { Outlet } from 'react-router-dom';
import WorkerSidebar from './WorkerSidebar';

const WorkerLayout = () => {
  return (
    <div className="flex min-h-screen bg-brand-dark">
      <WorkerSidebar />
      <main className="flex-1 ml-64 p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default WorkerLayout;
