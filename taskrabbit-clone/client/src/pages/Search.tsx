import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search as SearchIcon, Star, Shield, Loader2, Briefcase, Users, Tag, X } from 'lucide-react';
import { useSearchAllQuery } from '../features/search/searchApi';
import { ITaskerProfile, IUser, ICategory, ITask } from '../types';

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(params.get('q') ?? '');

  useEffect(() => {
    const q = params.get('q') ?? '';
    setInput(q);
    setQuery(q);
  }, [params]);

  const { data, isLoading, isFetching } = useSearchAllQuery(query, { skip: query.length < 2 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (q.length < 2) return;
    setParams({ q });
    setQuery(q);
  };

  const taskers = data?.taskers ?? [];
  const tasks = data?.tasks ?? [];
  const categories = data?.categories ?? [];
  const hasResults = taskers.length > 0 || tasks.length > 0 || categories.length > 0;
  const busy = isLoading || isFetching;

  return (
    <>
      <Helmet><title>{query ? `"${query}" — Search` : 'Search'} | NeighbourWork</title></Helmet>

      {/* Search bar */}
      <div className="bg-primary-700 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search for taskers, services, or tasks…"
              className="w-full pl-12 pr-12 py-4 rounded-2xl text-gray-900 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            {input && (
              <button
                type="button"
                onClick={() => { setInput(''); setParams({}); setQuery(''); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Loading */}
        {busy && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        )}

        {/* No query */}
        {!busy && !query && (
          <div className="text-center py-20 text-gray-400">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Type something to search across taskers, services, and tasks.</p>
          </div>
        )}

        {/* Query but no results */}
        {!busy && query.length >= 2 && !hasResults && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">No results found for &ldquo;{query}&rdquo;</p>
            <p className="text-sm">Try different keywords or <Link to="/taskers" className="text-primary-600 hover:underline">browse all taskers</Link>.</p>
          </div>
        )}

        {!busy && hasResults && (
          <div className="space-y-10">
            {/* Categories */}
            {categories.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 font-bold text-gray-900 mb-4 text-lg">
                  <Tag className="w-5 h-5 text-primary-600" /> Categories
                </h2>
                <div className="flex flex-wrap gap-3">
                  {categories.map((c: ICategory) => (
                    <Link
                      key={c._id}
                      to={`/taskers?category=${c._id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:border-primary-400 hover:bg-primary-50 transition-colors"
                    >
                      {c.icon && <span>{c.icon}</span>} {c.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Taskers */}
            {taskers.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                    <Users className="w-5 h-5 text-primary-600" /> Taskers
                  </h2>
                  <Link to={`/taskers?q=${encodeURIComponent(query)}`} className="text-sm text-primary-600 hover:underline">
                    See all →
                  </Link>
                </div>
                <div className="grid gap-4">
                  {taskers.map((t: ITaskerProfile) => {
                    const u = t.userId as IUser;
                    return (
                      <Link
                        key={t._id}
                        to={`/taskers/${t._id}`}
                        className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
                      >
                        <img
                          src={u?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || 'T')}&background=1D4ED8&color=fff`}
                          alt={u?.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-gray-900 truncate">{u?.name}</span>
                            {u?.isVerified && <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                          </div>
                          {t.headline && <p className="text-sm text-gray-500 truncate">{t.headline}</p>}
                          <StarRow rating={t.avgRating} />
                        </div>
                        <span className="text-sm font-medium text-primary-600 flex-shrink-0">View →</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Tasks */}
            {tasks.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 font-bold text-gray-900 mb-4 text-lg">
                  <Briefcase className="w-5 h-5 text-primary-600" /> Open Tasks
                </h2>
                <div className="grid gap-4">
                  {tasks.map((t: ITask) => {
                    const cat = t.categoryId as ICategory | undefined;
                    return (
                      <Link
                        key={t._id}
                        to={`/tasks/${t._id}`}
                        className="flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-xl flex-shrink-0">
                          {cat?.icon ?? '📋'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{t.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{t.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {cat && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cat.name}</span>}
                            {t.price && <span className="text-xs text-green-600 font-medium">${t.price.toFixed(2)}</span>}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-primary-600 flex-shrink-0">View →</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}
