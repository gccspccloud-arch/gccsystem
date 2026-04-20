import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <h1 className="text-6xl font-bold text-primary-300">404</h1>
      <p className="text-xl font-semibold text-gray-700">Page Not Found</p>
      <p className="text-gray-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-2">Go Back Home</Link>
    </div>
  );
};

export default NotFoundPage;
