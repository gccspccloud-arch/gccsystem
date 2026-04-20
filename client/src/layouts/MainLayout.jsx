import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        © {new Date().getFullYear()} Gospel Coalition Church · Sharing Christ, Changing Lives
      </footer>
    </div>
  );
};

export default MainLayout;
