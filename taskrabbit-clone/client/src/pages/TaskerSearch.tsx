import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Star, Shield, Award, ChevronLeft, ChevronRight, Loader2, SlidersHorizontal, X, Sparkles } from 'lucide-react';
import { useGetTaskersQuery } from '../features/taskers/taskerApi';
import { useGetCategoriesQuery } from '../features/categories/categoryApi';
import { useSearchTaskersQuery } from '../features/search/searchApi';
import { ITaskerProfile, IUser, ICategory } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

function TaskerCard({ tasker }: { tasker: ITaskerProfile }) {
  const user = tasker.userId as IUser;
  const skills = (tasker.skills as ICategory[]).slice(0, 3);
  const minRate = tasker.hourlyRates.length
    ? Math.min(...tasker.hourlyRates.map((r) => r.rate))
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 flex gap-4">
        <div className="relative flex-shrink-0">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'T')}&background=1D4ED8&color=fff`}
            alt={user?.name}
            loading="lazy"
            className="w-16 h-16 rounded-full object-cover"
          />
          {tasker.isElite && (
            <span className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-0.5">
              <Award className="w-3 h-3 text-white" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 truncate">{user?.name}</h3>
              {tasker.headline && (
                <p className="text-sm text-gray-500 truncate">{tasker.headline}</p>
              )}
            </div>
            {tasker.backgroundChecked && (
              <span className="flex-shrink-0 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <Shield className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <StarRating rating={tasker.avgRating} />
            <span className="text-xs text-gray-500">
              {tasker.avgRating.toFixed(1)} ({tasker.totalReviews})
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{tasker.totalTasksCompleted} tasks done</p>
        </div>
      </div>

      {/* Bio */}
      {tasker.bio && (
        <div className="px-5 pb-3">
          <p className="text-sm text-gray-600 line-clamp-2">{tasker.bio}</p>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span key={s._id} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
              {s.icon} {s.name}
            </span>
          ))}
          {(tasker.skills as ICategory[]).length > 3 && (
            <span className="text-xs text-gray-400">+{(tasker.skills as ICategory[]).length - 3} more</span>
          )}
        </div>
      )}

      {/* Availability */}
      {tasker.availability.length > 0 && (
        <div className="px-5 pb-3 flex gap-1">
          {DAYS.map((d, i) => {
            const active = tasker.availability.some((a) => a.day === i);
            return (
              <span
                key={d}
                className={`text-xs w-7 h-7 flex items-center justify-center rounded-full font-medium ${active ? 'bg-primary-100 text-primary-700' : 'text-gray-300'}`}
              >
                {d[0]}
              </span>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-gray-100 px-5 py-3 flex items-center justify-between">
        {minRate ? (
          <span className="text-sm font-semibold text-gray-800">From ${minRate}/hr</span>
        ) : (
          <span className="text-sm text-gray-400">Rate varies</span>
        )}
        <Link
          to={`/taskers/${tasker._id}`}
          className="text-sm font-medium text-white bg-primary-700 hover:bg-primary-800 px-4 py-1.5 rounded-lg transition-colors"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}

export default function TaskerSearch() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search input by 400ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const isSearchMode = debouncedSearch.length >= 2;

  // Browse mode: paginated + filters
  const browseParams: Record<string, string | number> = { page, limit: 12 };
  if (categoryFilter) browseParams.category = categoryFilter;
  if (minRating) browseParams.minRating = minRating;
  if (maxRate) browseParams.maxRate = maxRate;

  const { data: browseData, isLoading: browseLoading } = useGetTaskersQuery(browseParams, { skip: isSearchMode });
  const { data: searchData, isLoading: searchLoading, isFetching: searchFetching } = useSearchTaskersQuery(
    { q: debouncedSearch, page, limit: 12 },
    { skip: !isSearchMode }
  );
  const { data: categories = [] } = useGetCategoriesQuery();

  const activeData = isSearchMode ? searchData : (browseData as unknown as typeof searchData);
  const isLoading = isSearchMode ? (searchLoading || searchFetching) : browseLoading;

  const taskers = activeData?.data ?? [];
  const totalPages = activeData?.totalPages ?? 1;
  const total = activeData?.total ?? 0;

  const clearFilters = () => {
    setCategoryFilter('');
    setMinRating('');
    setMaxRate('');
    setPage(1);
  };

  const hasFilters = !!(categoryFilter || minRating || maxRate);

  return (
    <>
      <Helmet><title>Find a Tasker | NeighbourWork</title></Helmet>

      {/* Header */}
      <div className="bg-primary-700 text-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Find a Tasker</h1>
          <p className="text-primary-200 mb-6">Browse verified professionals ready to help today.</p>
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
              placeholder="Search by name, skill, or describe what you need…"
              className="w-full pl-11 pr-10 py-3 rounded-xl text-gray-900 text-sm focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {isSearchMode && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-primary-200">
              <Sparkles className="w-3.5 h-3.5" /> Semantic search active
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters {hasFilters && <span className="bg-primary-700 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>}
          </button>

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
            ))}
          </select>

          {showFilters && (
            <>
              <select
                value={minRating}
                onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any rating</option>
                <option value="4">4+ stars</option>
                <option value="4.5">4.5+ stars</option>
              </select>

              <select
                value={maxRate}
                onChange={(e) => { setMaxRate(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any price</option>
                <option value="40">Up to $40/hr</option>
                <option value="60">Up to $60/hr</option>
                <option value="80">Up to $80/hr</option>
              </select>
            </>
          )}

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}

          <span className="ml-auto text-sm text-gray-500">
            {isSearchMode
              ? <><Sparkles className="inline w-3.5 h-3.5 mr-1 text-primary-600" />{total} result{total !== 1 ? 's' : ''} for &ldquo;{debouncedSearch}&rdquo;</>
              : <>{total} tasker{total !== 1 ? 's' : ''} found</>}
          </span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
          </div>
        ) : taskers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No taskers found matching your filters.</p>
            <button onClick={clearFilters} className="mt-3 text-primary-600 hover:underline text-sm">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {taskers.map((t) => <TaskerCard key={t._id} tasker={t} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
