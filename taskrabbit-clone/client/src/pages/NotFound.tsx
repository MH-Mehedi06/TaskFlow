import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, ArrowLeft, Search, Wrench } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet><title>Page Not Found | NeighbourWork</title></Helmet>

      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-20 bg-gray-50">
        <div className="max-w-md w-full text-center">
          {/* Illustration */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center">
                <Wrench className="w-14 h-14 text-primary-300" />
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center font-bold text-red-400 text-sm">
                404
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Page not found</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            We couldn't find the page you're looking for. It may have been moved or deleted.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Go back
            </button>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Home className="w-4 h-4" /> Home
            </Link>
            <Link
              to="/search"
              className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Search className="w-4 h-4" /> Search
            </Link>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-400 mb-4">Looking for something specific?</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { to: '/services', label: 'Services' },
                { to: '/taskers', label: 'Find Taskers' },
                { to: '/become-a-tasker', label: 'Become a Tasker' },
                { to: '/book', label: 'Book a Task' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} className="text-sm text-primary-600 hover:underline">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
