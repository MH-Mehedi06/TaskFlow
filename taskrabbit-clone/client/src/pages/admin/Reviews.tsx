import { Helmet } from 'react-helmet-async';
import { Star, CheckCircle, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetPendingReviewsQuery, useModerateReviewMutation } from '../../features/admin/adminApi';
import { IReview, IUser } from '../../types';

export default function Reviews() {
  const { data: reviews = [], isLoading } = useGetPendingReviewsQuery();
  const [moderate] = useModerateReviewMutation();

  const handle = async (id: string, approved: boolean) => {
    try {
      await moderate({ id, approved }).unwrap();
      toast.success(approved ? 'Review approved' : 'Review rejected');
    } catch { toast.error('Failed'); }
  };

  return (
    <>
      <Helmet><title>Reviews | Admin</title></Helmet>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pending Reviews</h2>
          <p className="text-sm text-gray-500 mt-0.5">Moderate reviews flagged by the AI or users</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No reviews pending moderation</p>
            <p className="text-sm mt-1">All reviews have been moderated.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review: IReview) => {
              const reviewer = review.reviewerId as IUser | undefined;
              const reviewee = review.revieweeId as IUser | undefined;
              return (
                <div key={review._id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((n) => (
                            <Star key={n} className={`w-4 h-4 ${n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">
                          by <strong className="text-gray-600">{typeof reviewer !== 'string' ? reviewer?.name : '?'}</strong>
                          {' '}→ <strong className="text-gray-600">{typeof reviewee !== 'string' ? reviewee?.name : '?'}</strong>
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                      {review.aiModerationScore !== undefined && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            AI score: {(review.aiModerationScore * 100).toFixed(0)}%
                          </span>
                          {review.aiModerationReason && (
                            <span className="text-xs text-gray-400">{review.aiModerationReason}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handle(review._id, true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handle(review._id, false)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
