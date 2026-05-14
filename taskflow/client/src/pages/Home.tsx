import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Search, ArrowRight, Star, Shield, Clock, DollarSign,
  CheckCircle, Wrench, Users, Award, Sparkles, Loader2,
  ChevronRight, MapPin,
} from 'lucide-react';
import { useGetCategoriesQuery } from '../features/categories/categoryApi';
import { useGetTaskersQuery } from '../features/taskers/taskerApi';
import { ICategory, ITaskerProfile, IUser } from '../types';
import { useAppSelector } from '../app/hooks';

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    else navigate('/taskers');
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F2044] via-primary-800 to-primary-600 text-white py-24 px-4">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <span className="inline-flex items-center gap-1.5 bg-white/10 text-white text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" /> Trusted by 100,000+ customers
        </span>

        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-5 tracking-tight">
          Get help from a skilled<br />
          <span className="text-accent">local Tasker</span> today
        </h1>

        <p className="text-xl text-blue-200 mb-10 max-w-2xl mx-auto leading-relaxed">
          Book background-checked professionals for cleaning, moving, handyman work, and more — in your neighbourhood.
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex gap-2 bg-white rounded-2xl p-2 shadow-2xl">
            <div className="flex-1 flex items-center gap-3 px-3">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you need help with?"
                className="w-full text-gray-900 text-sm focus:outline-none placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              className="flex-shrink-0 bg-primary-700 hover:bg-primary-800 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Find Taskers
            </button>
          </div>
        </form>

        {/* Popular quick links */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="text-blue-300 text-sm">Popular:</span>
          {['Home Cleaning', 'Handyman', 'Moving', 'Gardening', 'IKEA Assembly'].map((tag) => (
            <button
              key={tag}
              onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
              className="text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>

        {!user && (
          <p className="mt-8 text-blue-300 text-sm">
            Already a Tasker?{' '}
            <Link to="/login" className="text-white font-semibold hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </section>
  );
}

// ── Trust strip ───────────────────────────────────────────────────────────────

function TrustStrip() {
  return (
    <section className="bg-white border-b border-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {[
          { value: '50K+', label: 'Verified Taskers', icon: Users },
          { value: '4.8★', label: 'Average rating', icon: Star },
          { value: '2M+', label: 'Tasks completed', icon: CheckCircle },
          { value: '$1M', label: 'Liability coverage', icon: Shield },
        ].map(({ value, label, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center">
            <Icon className="w-5 h-5 text-primary-600 mb-2" />
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Popular categories ────────────────────────────────────────────────────────

function PopularCategories() {
  const { data: categories = [], isLoading } = useGetCategoriesQuery();
  const featured = categories.filter((c) => c.trending || c.sortOrder <= 8).slice(0, 8);

  return (
    <section className="bg-gray-50 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Popular services</h2>
          <p className="text-gray-500">Whatever you need, there's a Tasker for it.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((cat) => (
              <CategoryCard key={cat._id} category={cat} />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 border border-gray-300 hover:border-primary-400 text-gray-700 hover:text-primary-700 font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Browse all services <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: ICategory }) {
  return (
    <Link
      to={`/book?category=${category.slug}`}
      className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition-all flex flex-col items-center text-center gap-3"
    >
      <span className="text-4xl">{category.icon}</span>
      <div>
        <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors text-sm leading-tight">{category.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">From ${category.startingPrice}/hr</p>
      </div>
      {category.trending && (
        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Trending</span>
      )}
    </Link>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: '01', icon: Search, color: 'text-blue-600 bg-blue-50',
      title: 'Describe your task',
      desc: 'Tell us what you need — pick a category, add details, and choose a date that works.',
    },
    {
      n: '02', icon: Users, color: 'text-purple-600 bg-purple-50',
      title: 'Choose your Tasker',
      desc: 'Browse profiles, reviews, and prices. Chat before you commit — no pressure.',
    },
    {
      n: '03', icon: CheckCircle, color: 'text-green-600 bg-green-50',
      title: 'Get it done & pay',
      desc: 'Your Tasker arrives on time. Pay securely through the app once the job is complete.',
    },
  ];

  return (
    <section className="bg-white py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">How TaskFlow works</h2>
          <p className="text-gray-500">From booking to done — in three simple steps.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gray-100" aria-hidden />

          {steps.map((s) => (
            <div key={s.n} className="flex flex-col items-center text-center relative">
              <div className={`w-16 h-16 rounded-2xl ${s.color} flex items-center justify-center mb-5 shadow-sm`}>
                <s.icon className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{s.n}</span>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/book"
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-bold px-8 py-4 rounded-xl transition-colors text-base shadow-lg"
          >
            Book a Tasker now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Top taskers ───────────────────────────────────────────────────────────────

function TopTaskers() {
  const { data, isLoading } = useGetTaskersQuery({ limit: 3, page: 1 });
  const taskers = (data as unknown as { data: ITaskerProfile[] })?.data ?? [];

  if (isLoading || taskers.length === 0) return null;

  return (
    <section className="bg-gray-50 py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Meet top-rated Taskers</h2>
          <p className="text-gray-500">Background-checked, reviewed, and ready to help.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {taskers.map((t) => {
            const u = t.userId as IUser;
            const skills = (t.skills as ICategory[]).slice(0, 2);
            return (
              <Link
                key={t._id}
                to={`/taskers/${t._id}`}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-primary-300 transition-all flex flex-col items-center text-center"
              >
                <div className="relative mb-4">
                  <img
                    src={u?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name ?? 'T')}&background=1D4ED8&color=fff&size=96`}
                    alt={u?.name}
                    loading="lazy"
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-primary-100"
                  />
                  {t.isElite && (
                    <span className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1">
                      <Award className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}
                </div>

                <p className="font-bold text-gray-900">{u?.name}</p>
                {t.headline && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{t.headline}</p>}

                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(t.avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">{t.avgRating.toFixed(1)} ({t.totalReviews})</span>
                </div>

                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {skills.map((s) => (
                    <span key={s._id} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{s.name}</span>
                  ))}
                </div>

                {t.backgroundChecked && (
                  <span className="mt-3 flex items-center gap-1 text-xs text-green-600">
                    <Shield className="w-3 h-3" /> Background checked
                  </span>
                )}

                <span className="mt-4 text-sm font-semibold text-primary-700">
                  From ${Math.min(...(t.hourlyRates.length ? t.hourlyRates.map((r) => r.rate) : [0]))}/hr
                </span>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/taskers"
            className="inline-flex items-center gap-2 border border-gray-300 hover:border-primary-400 text-gray-700 hover:text-primary-700 font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Browse all Taskers <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Why us ────────────────────────────────────────────────────────────────────

function WhyUs() {
  const features = [
    { icon: Shield, color: 'text-green-600 bg-green-50', title: '$1M liability insurance', desc: 'Every task is covered. We have you and the Tasker protected.' },
    { icon: Star, color: 'text-yellow-600 bg-yellow-50', title: 'Verified reviews', desc: 'All reviews come from real customers who completed a task.' },
    { icon: Clock, color: 'text-blue-600 bg-blue-50', title: 'Same-day availability', desc: 'Many Taskers are available today. Book in under 5 minutes.' },
    { icon: DollarSign, color: 'text-purple-600 bg-purple-50', title: 'Transparent pricing', desc: 'See hourly rates upfront — no hidden fees or surprise charges.' },
    { icon: MapPin, color: 'text-red-600 bg-red-50', title: 'In your neighbourhood', desc: 'All Taskers are local. Short commute means faster service.' },
    { icon: Wrench, color: 'text-orange-600 bg-orange-50', title: 'Skilled professionals', desc: 'Taskers pass skills tests and background checks before joining.' },
  ];

  return (
    <section className="bg-white py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Why people love TaskFlow</h2>
          <p className="text-gray-500">Built around trust, transparency, and quality.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="flex gap-4 p-5 rounded-2xl border border-gray-100 hover:border-primary-200 transition-colors">
              <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  { name: 'Sarah M.', location: 'New York, NY', avatar: 'S', rating: 5, text: 'My Tasker showed up on time and completely transformed my apartment. Booking took 3 minutes. I use TaskFlow every month now.' },
  { name: 'James T.', location: 'Austin, TX', avatar: 'J', rating: 5, text: 'Found an amazing handyman for my bathroom renovation. Clear pricing, professional work, and the in-app chat made communication seamless.' },
  { name: 'Priya K.', location: 'San Francisco, CA', avatar: 'P', rating: 5, text: 'The background check feature really puts my mind at ease. My Tasker was fantastic and I left a 5-star review without hesitation.' },
];

function Testimonials() {
  return (
    <section className="bg-gray-50 py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">What our customers say</h2>
          <p className="text-gray-500">Over 2 million tasks completed across the country.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`w-4 h-4 ${i <= t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Join as tasker CTA ────────────────────────────────────────────────────────

function TaskerCTA() {
  const { user } = useAppSelector((s) => s.auth);
  if (user?.role === 'tasker') return null;

  return (
    <section className="bg-gradient-to-r from-[#0F2044] to-primary-700 text-white py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Turn your skills into income</h2>
        <p className="text-blue-200 text-lg mb-8">Join 50,000+ Taskers earning on their own schedule. Keep 80% of every job.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/become-a-tasker"
            className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-4 rounded-xl hover:bg-primary-50 transition-colors text-base shadow-lg"
          >
            Become a Tasker <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 border border-white/40 hover:border-white text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Browse services
          </Link>
        </div>
        <p className="mt-4 text-blue-300 text-sm">No subscription fees · No upfront costs · Get paid fast</p>
      </div>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Helmet>
        <title>TaskFlow — Get help from local Taskers</title>
        <meta name="description" content="Hire background-checked local Taskers for cleaning, moving, handyman work, and more. Book in minutes." />
      </Helmet>
      <Hero />
      <TrustStrip />
      <PopularCategories />
      <HowItWorks />
      <TopTaskers />
      <WhyUs />
      <Testimonials />
      <TaskerCTA />
    </>
  );
}
