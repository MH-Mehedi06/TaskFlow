import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { DollarSign, Clock, Star, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { useAppSelector } from '../app/hooks';

const steps = [
  { n: '1', title: 'Create your profile', desc: 'Sign up, pick your skills, and set your hourly rate.' },
  { n: '2', title: 'Set your schedule', desc: "Choose when you're available and how far you'll travel." },
  { n: '3', title: 'Start earning', desc: 'Accept tasks, complete the work, and get paid fast.' },
];

const perks = [
  { icon: DollarSign, title: 'Keep 80% of what you earn', desc: 'Our 20% platform fee covers insurance, payments, and support.' },
  { icon: Clock, title: 'Work on your own schedule', desc: 'Accept tasks when it suits you — full-time, part-time, or weekends.' },
  { icon: Star, title: 'Build your reputation', desc: 'Great reviews unlock Elite status and higher visibility.' },
  { icon: Shield, title: 'Insured & protected', desc: 'Every task is covered by our $1 million liability insurance.' },
];

export default function BecomeTasker() {
  const { user } = useAppSelector((s) => s.auth);

  const ctaLink = user
    ? user.role === 'tasker'
      ? '/tasker/onboarding'
      : '/register?role=tasker'
    : '/register?role=tasker';

  return (
    <>
      <Helmet><title>Become a Tasker | TaskFlow</title></Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/10 text-white text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            Join 50,000+ Taskers
          </span>
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            Turn your skills into income
          </h1>
          <p className="text-xl text-primary-200 mb-10 max-w-2xl mx-auto">
            Set your own rates, choose your hours, and grow a business doing what you're good at.
          </p>
          <Link
            to={ctaLink}
            className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-4 rounded-xl hover:bg-primary-50 transition-colors text-lg shadow-lg"
          >
            Get started free <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-primary-300 text-sm">No subscription fees. No upfront costs.</p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100 py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { value: '$28', label: 'Average hourly rate' },
            { value: '2M+', label: 'Tasks completed' },
            { value: '4.8★', label: 'Average tasker rating' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-4xl font-extrabold text-primary-700">{value}</p>
              <p className="text-gray-500 mt-1 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary-700 text-white text-xl font-bold flex items-center justify-center mx-auto mb-5">
                  {s.n}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Taskers love it</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {perks.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-6 rounded-2xl border border-gray-100 hover:border-primary-200 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular categories</h2>
          <p className="text-gray-500 mb-10">Pick any skill — clients are waiting.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Home Cleaning', 'Handyman', 'Moving', 'Outdoor & Gardening', 'Tech Support', 'Painting', 'Fitness & Wellness'].map((cat) => (
              <span key={cat} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-700 text-white py-20 px-4 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to start earning?</h2>
        <p className="text-primary-200 mb-8 text-lg">Create your free profile in under 5 minutes.</p>
        <Link
          to={ctaLink}
          className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-4 rounded-xl hover:bg-primary-50 transition-colors text-lg"
        >
          Apply to be a Tasker <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </>
  );
}
