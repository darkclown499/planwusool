import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { toast } from '@/components/custom-toast';
import { getImageUrl } from '@/utils/image-helper';

interface ReviewCustomer {
  id: string | number;
  display_name?: string;
  initials?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
}

interface Review {
  id: string | number;
  rating: number;
  title?: string | null;
  comment?: string | null;
  images?: string[];
  is_verified_purchase: boolean;
  admin_reply?: string | null;
  created_at: string;
  customer: ReviewCustomer;
}

interface ProductReviewsProps {
  productId: string | number;
}

const RATING_LABELS = ['', 'سيئ جداً', 'سيئ', 'متوسط', 'جيد', 'ممتاز'];

function Star({ filled, onClick, onHover }: { filled: boolean; onClick?: () => void; onHover?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className={`${onClick ? 'cursor-pointer' : 'cursor-default'} transition-colors`}
      aria-label="تقييم"
    >
      <svg
        className={`w-6 h-6 ${filled ? 'text-amber-400 fill-current' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
  );
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId }) => {
  const { isLoggedIn, setShowLoginModal } = useAuth();
  const { store } = useStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(route('api.reviews.product', { productId }));
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews?.data || data.reviews || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      toast.error('يرجى اختيار التقييم');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('product_id', String(productId));
      formData.append('store_id', String(store.id));
      formData.append('rating', String(rating));
      formData.append('title', title);
      formData.append('comment', comment);
      images.forEach((image) => formData.append('images[]', image));

      const response = await fetch(route('api.reviews.store'), {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'تم تحديث تقييمك');
        setShowForm(false);
        setRating(0);
        setTitle('');
        setComment('');
        setImages([]);
      } else {
        toast.error(data.message || 'تعذر إرسال التقييم');
      }
    } catch (error) {
      toast.error('تعذر إرسال التقييم');
      console.error('Failed to submit review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const average = stats?.average_rating || 0;
  const total = stats?.total_reviews || reviews.length;

  return (
    <div className="pt-4 mt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 text-base">التقييمات</h4>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="flex items-center gap-1 text-sm font-semibold text-gray-900">
              <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {average.toFixed(1)}
              <span className="text-gray-400 font-normal">({total})</span>
            </span>
          )}
          {isLoggedIn ? (
            <button
              onClick={() => setShowForm((prev) => !prev)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              {showForm ? 'إلغاء' : 'أضف تقييمك'}
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              سجّل الدخول للتقييم
            </button>
          )}
        </div>
      </div>

      {showForm && isLoggedIn && (
        <form onSubmit={handleSubmit} className="mb-5 p-4 bg-gray-50 rounded-xl space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">تقييمك</p>
            <div className="flex gap-0.5" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  filled={value <= (hoverRating || rating)}
                  onClick={() => setRating(value)}
                  onHover={() => setHoverRating(value)}
                />
              ))}
            </div>
            {rating > 0 && <p className="text-xs text-gray-500 mt-1">{RATING_LABELS[rating]}</p>}
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان التقييم (اختياري)"
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اكتب تجربتك مع المنتج..."
            rows={3}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div>
            <label className="text-xs text-gray-500 block mb-1">صور (اختياري)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files || []))}
              className="text-xs text-gray-600"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? 'جارٍ الإرسال...' : 'إرسال التقييم'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">لا توجد تقييمات بعد</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                    {review.customer?.initials || review.customer?.first_name?.[0] || 'ز'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {review.customer?.display_name || `${review.customer?.first_name || ''} ${review.customer?.last_name || ''}`.trim() || 'عميل'}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <svg
                            key={value}
                            className={`w-3.5 h-3.5 ${value <= review.rating ? 'text-amber-400 fill-current' : 'text-gray-200 fill-current'}`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      {review.is_verified_purchase && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                          شراء موثق
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>

              {review.title && <p className="text-sm font-semibold text-gray-900 mb-1">{review.title}</p>}
              {review.comment && <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {review.images.map((image, index) => (
                    <img
                      key={index}
                      src={getImageUrl(image)}
                      alt="صورة التقييم"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {review.admin_reply && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-1">رد المتجر:</p>
                  <p className="text-sm text-gray-600">{review.admin_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
