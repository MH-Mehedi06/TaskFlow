import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, ChevronDown, ChevronUp, ArrowRight, Loader2 } from 'lucide-react';
import { useGetCategoriesQuery } from '../features/categories/categoryApi';
import { ICategory } from '../types';

export default function Services() {
  const { slug } = useParams<{ slug?: string }>();
  const { data: categories = [], isLoading, isError } = useGetCategoriesQuery();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // If a slug is in the URL, auto-expand that category
  const slugCategory = slug ? categories.find((c) => c.slug === slug) : undefined;

  const filtered = (slugCategory ? [slugCategory] : categories).filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    cat.description?.toLowerCase().includes(search.toLowerCase()) ||
    cat.children?.some((c) => c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const pageTitle = slugCategory ? `${slugCategory.name} Services` : 'Services';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load services. Please try again.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{pageTitle} | TaskFlow</title></Helmet>

      {/* Hero */}
      <div className="bg-primary-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-3">
            {slugCategory ? `${slugCategory.icon} ${slugCategory.name}` : 'What do you need help with?'}
          </h1>
          <p className="text-primary-200 mb-8 text-lg">
            {slugCategory
              ? (slugCategory.description || `Book a skilled ${slugCategory.name} Tasker today.`)
              : 'Browse 40+ services and book a Tasker in minutes.'}
          </p>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services…"
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Trending tags */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Trending:</span>
          {categories
            .flatMap((c) => c.trendingTags || [])
            .slice(0, 8)
            .map((tag) => (
              <button
                key={tag}
                onClick={() => setSearch(tag)}
                className="px-3 py-1 rounded-full bg-gray-100 hover:bg-primary-100 hover:text-primary-700 text-sm text-gray-600 transition-colors"
              >
                {tag}
              </button>
            ))}
        </div>
      </div>

      {/* Category grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No services match "{search}".</p>
            <button onClick={() => setSearch('')} className="mt-3 text-primary-600 hover:underline text-sm">
              Clear search
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">{filtered.length} service {filtered.length === 1 ? 'category' : 'categories'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((cat) => (
                <CategoryCard
                  key={cat._id}
                  category={cat}
                  isExpanded={expandedId === cat._id}
                  onToggle={() => toggle(cat._id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* CTA */}
      <div className="bg-gray-50 border-t border-gray-100 py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Don't see what you need?</h2>
        <p className="text-gray-500 mb-6">Post a custom task and let Taskers reach out to you.</p>
        <Link
          to="/book"
          className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Post a Task <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </>
  );
}

function CategoryCard({
  category,
  isExpanded,
  onToggle,
}: {
  category: ICategory;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const subCount = category.children?.length ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-4xl">{category.icon}</span>
          {category.trending && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">
              Trending
            </span>
          )}
        </div>
        <h2 className="text-lg font-bold text-gray-900">{category.name}</h2>
        {category.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{category.description}</p>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
          <span>From <strong className="text-gray-800">${category.startingPrice}/hr</strong></span>
          <span>{subCount} service{subCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Subcategories (expandable) */}
      {subCount > 0 && (
        <>
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {isExpanded ? 'Hide services' : 'View all services'}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isExpanded && (
            <ul className="divide-y divide-gray-100">
              {(category.children ?? []).map((sub) => (
                <SubCategoryRow key={sub._id} sub={sub} parentSlug={category.slug} />
              ))}
            </ul>
          )}
        </>
      )}

      {/* Quick book if no subs or collapsed */}
      {!isExpanded && (
        <div className="px-6 pb-5">
          <Link
            to={`/book?category=${category.slug}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            Book now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

function SubCategoryRow({ sub, parentSlug }: { sub: ICategory; parentSlug: string }) {
  return (
    <li className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
      <div>
        <p className="text-sm font-medium text-gray-800">{sub.name}</p>
        <p className="text-xs text-gray-400">From ${sub.startingPrice}/hr</p>
      </div>
      <Link
        to={`/book?category=${parentSlug}&service=${sub.slug}`}
        className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
      >
        Book <ArrowRight className="w-3 h-3" />
      </Link>
    </li>
  );
}
