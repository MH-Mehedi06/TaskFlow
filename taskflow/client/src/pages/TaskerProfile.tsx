import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, Shield, Award, MapPin, Clock, CheckCircle, ArrowRight, Loader2, MessageSquare } from 'lucide-react';
import { useGetTaskerByIdQuery } from '../features/taskers/taskerApi';
import { useGetReviewsByUserQuery } from '../features/reviews/reviewApi';
import { IUser, ICategory, IReview } from '../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

export default function TaskerProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isLoading, isError } = useGetTaskerByIdQuery(id!);
  const { data: reviewData } = useGetReviewsByUserQuery({ userId: id! }, { skip: !id });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Tasker profile not found.</p>
          <Link to="/search" className="text-primary-600 hover:underline">Back to search</Link>
        </div>
      </div>
    );
  }

  const user = profile.userId as IUser;
  const skills = profile.skills as ICategory[];
  const minRate = profile.hourlyRates.length
    ? Math.min(...profile.hourlyRates.map((r) => r.rate))
    : null;

  return (
    <>
      <Helmet><title>{user?.name} | Tasker Profile</title></Helmet>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: sticky sidebar */}
          <div className="lg:col-span-1 space-y-5">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <div className="relative inline-block mb-4">
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'T')}&background=1D4ED8&color=fff&size=128`}
                  alt={user?.name}
                  className="w-28 h-28 rounded-full object-cover mx-auto"
                />
                {profile.isElite && (
                  <span className="absolute bottom-1 right-1 bg-yellow-400 rounded-full p-1">
                    <Award className="w-4 h-4 text-white" />
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
              {profile.headline && <p className="text-gray-500 text-sm mt-1">{profile.headline}</p>}

              <div className="flex items-center justify-center gap-2 mt-3">
                <StarRating rating={profile.avgRating} />
                <span className="text-sm text-gray-600">
                  {profile.avgRating.toFixed(1)} ({profile.totalReviews} reviews)
                </span>
              </div>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {profile.backgroundChecked && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                    <Shield className="w-3 h-3" /> Background checked
                  </span>
                )}
                {profile.isElite && (
                  <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full">
                    <Award className="w-3 h-3" /> Elite Tasker
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-bold text-gray-900">{profile.totalTasksCompleted}</p>
                  <p className="text-gray-400 text-xs">Tasks done</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{minRate ? `$${minRate}/hr` : '—'}</p>
                  <p className="text-gray-400 text-xs">Starting rate</p>
                </div>
              </div>

              {profile.serviceRadius && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <MapPin className="w-3.5 h-3.5" /> Travels up to {profile.serviceRadius} miles
                </div>
              )}

              <Link
                to={`/book?taskerId=${profile._id}`}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Book {user?.name?.split(' ')[0]} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Certifications */}
            {profile.certifications.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Certifications</h3>
                <ul className="space-y-2">
                  {profile.certifications.map((cert, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {profile.bio && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-3">About</h2>
                <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Skills & Rates */}
            {skills.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-4">Services & Rates</h2>
                <div className="space-y-3">
                  {skills.map((skill) => {
                    const rate = profile.hourlyRates.find((r) => r.categoryId === skill._id);
                    return (
                      <div key={skill._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <span className="text-sm font-medium text-gray-700">
                          {skill.icon} {skill.name}
                        </span>
                        <span className="text-sm font-semibold text-primary-700">
                          {rate ? `$${rate.rate}/hr` : 'Custom'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Availability */}
            {profile.availability.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-4">
                  <Clock className="inline w-5 h-5 mr-2 text-gray-400" />
                  Availability
                </h2>
                <div className="space-y-2">
                  {profile.availability
                    .sort((a, b) => a.day - b.day)
                    .map(({ day, slots }) => (
                      <div key={day} className="flex items-center gap-4 text-sm">
                        <span className="w-24 font-medium text-gray-700">{DAYS[day]}</span>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((s, i) => (
                            <span key={i} className="bg-primary-50 text-primary-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                              {s.start} – {s.end}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Portfolio */}
            {profile.portfolio.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-4">Portfolio</h2>
                <div className="grid grid-cols-3 gap-3">
                  {profile.portfolio.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Portfolio ${i + 1}`}
                      className="w-full h-28 object-cover rounded-xl border border-gray-100"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {(reviewData?.reviews?.length ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-gray-900 text-lg">Reviews</h2>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-semibold">{reviewData!.avg.toFixed(1)}</span>
                    <span className="text-gray-400">({reviewData!.total})</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {reviewData!.reviews.map((review: IReview) => {
                    const reviewer = review.reviewerId as IUser | undefined;
                    return (
                      <div key={review._id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {typeof reviewer !== 'string' && reviewer?.avatar ? (
                              <img src={reviewer.avatar} alt={reviewer.name} loading="lazy" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                                {typeof reviewer !== 'string' ? reviewer?.name?.charAt(0) : '?'}
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-800">
                              {typeof reviewer !== 'string' ? reviewer?.name : 'Anonymous'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {[1,2,3,4,5].map((n) => (
                              <Star key={n} className={`w-3.5 h-3.5 ${n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                        {review.reply && (
                          <div className="mt-2 ml-3 pl-3 border-l-2 border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-0.5">Tasker's reply</p>
                            <p className="text-xs text-gray-600">{review.reply}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Book CTA (mobile) */}
            <div className="lg:hidden bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-3">Starting from <strong className="text-gray-900">{minRate ? `$${minRate}/hr` : 'custom rate'}</strong></p>
              <Link
                to={`/book?taskerId=${profile._id}`}
                className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Book Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
