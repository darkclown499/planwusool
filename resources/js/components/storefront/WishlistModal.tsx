import React, { useEffect } from 'react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getImageUrl } from '@/utils/image-helper';
import { getProductThumbnail } from '@/utils/product-image-helper';
import { formatCurrency } from '@/utils/currency-formatter';
import { toast } from '@/components/custom-toast';

interface WishlistModalProps {
  onClose: () => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({ onClose }) => {
  const { items, loading, remove, refresh } = useWishlist();
  const { isLoggedIn, setShowLoginModal } = useAuth();
  const { addToCart } = useCart();

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  useEffect(() => {
    if (isLoggedIn) refresh();
  }, [isLoggedIn, refresh]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[80] overflow-y-auto" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative min-h-full flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-3">المفضلة</h2>
            <p className="text-gray-600 mb-6">سجّل الدخول لعرض منتجاتك المفضلة</p>
            <button
              onClick={() => {
                onClose();
                setShowLoginModal(true);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative min-h-full flex items-center justify-center p-2 md:p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">المفضلة</h2>
              <p className="text-gray-500 text-sm">{items.length} منتج</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <p className="text-gray-500 mb-4">لا توجد منتجات في المفضلة بعد</p>
                <button
                  onClick={onClose}
                  className="text-blue-600 font-semibold hover:text-blue-700 cursor-pointer"
                >
                  تصفح المنتجات
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                    {getProductThumbnail(item) ? (
                      <img
                        src={getImageUrl(getProductThumbnail(item))}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{item.name}</h3>
                      <p className="text-gray-500 text-xs">{item.category?.name || ''}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5">
                        {formatCurrency(item.sale_price || item.price, storeSettings, currencies)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={async () => {
                          await addToCart({
                            id: String(item.product_id),
                            name: item.name,
                            price: Number(item.sale_price || item.price),
                            image: getProductThumbnail(item) || '',
                            sku: '',
                            stockQuantity: Number(item.stock) || 0,
                            categoryId: String(item.category?.id || ''),
                            availability: Number(item.stock) > 0 ? 'in_stock' : 'out_of_stock'
                          } as any);
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        أضف للسلة
                      </button>
                      <button
                        onClick={async () => {
                          await remove(item.id);
                          toast.success('تمت الإزالة من المفضلة');
                        }}
                        className="text-xs text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
