import React, { useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getImageUrl } from '@/utils/image-helper';
import { formatCurrency } from '@/utils/currency-formatter';
import { toast } from '@/components/custom-toast';
import { css } from '@/builder/sections/helpers';
import { ModalShell } from './shared';

interface WishlistProps {
  onClose: () => void;
}

/**
 * editorial-boutique wishlist — flat rows (no bordered card chrome) and a
 * sharp-corner blush "أضيفي للسلة" button, matching Cart.tsx exactly so
 * moving between the two overlays feels like the same product.
 */
export const Wishlist: React.FC<WishlistProps> = ({ onClose }) => {
  const { items, loading, remove, refresh } = useWishlist();
  const { isLoggedIn, setShowLoginModal } = useAuth();
  const { addToCart } = useCart();

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  useEffect(() => {
    if (isLoggedIn) refresh();
  }, [isLoggedIn, refresh]);

  const border = css('--twc-border', '#ededed');
  const textPrimary = css('--twc-text-primary', '#161311');
  const textSecondary = css('--twc-text-secondary', '#8a8178');
  const primary = css('--twc-primary', '#f6d7d5');
  const radius = css('--twx-radius', '4px');

  if (!isLoggedIn) {
    return (
      <ModalShell onClose={onClose} title="المفضلة" icon={<Heart className="h-5 w-5" />}>
        <div className="p-8 text-center">
          <p className="mb-6 text-sm" style={{ color: textSecondary }}>
            سجّلي الدخول لعرض منتجاتك المفضلة
          </p>
          <button
            onClick={() => {
              onClose();
              setShowLoginModal(true);
            }}
            className="w-full py-3 text-xs font-semibold uppercase tracking-[0.12em] transition hover:opacity-85"
            style={{ background: primary, color: '#000000', borderRadius: radius }}
          >
            تسجيل الدخول
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title={`المفضلة (${items.length})`} icon={<Heart className="h-5 w-5" />}>
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: textPrimary }} />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <Heart className="mx-auto mb-4 h-10 w-10" style={{ color: css('--twc-muted', '#d9cfc8') }} />
            <p className="mb-4 text-sm" style={{ color: textSecondary }}>
              لا توجد منتجات في المفضلة بعد
            </p>
            <button onClick={onClose} className="text-xs font-semibold uppercase tracking-[0.1em] transition hover:opacity-70" style={{ color: textPrimary }}>
              تصفحي المنتجات
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: border }}>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-4 first:pt-0">
                {item.cover_image ? (
                  <img src={getImageUrl(item.cover_image)} alt={item.name} className="h-16 w-16 shrink-0 object-cover" style={{ borderRadius: radius }} />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center" style={{ background: css('--twc-surface', '#faf8f6'), borderRadius: radius }}>
                    <Heart className="h-5 w-5" style={{ color: css('--twc-muted', '#d9cfc8') }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium" style={{ color: textPrimary }}>
                    {item.name}
                  </h3>
                  <p className="text-xs" style={{ color: textSecondary }}>
                    {item.category?.name || ''}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: textPrimary }}>
                    {formatCurrency(item.sale_price || item.price, storeSettings, currencies)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={async () => {
                      await addToCart({
                        id: String(item.product_id),
                        name: item.name,
                        price: Number(item.sale_price || item.price),
                        image: item.cover_image || '',
                        sku: '',
                        stockQuantity: Number(item.stock) || 0,
                        categoryId: String(item.category?.id || ''),
                        availability: Number(item.stock) > 0 ? 'in_stock' : 'out_of_stock',
                      } as any);
                    }}
                    className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition hover:opacity-85"
                    style={{ background: primary, color: '#000000', borderRadius: radius }}
                  >
                    أضيفي للسلة
                  </button>
                  <button
                    onClick={async () => {
                      await remove(item.id);
                      toast.success('تمت الإزالة من المفضلة');
                    }}
                    className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition hover:opacity-70"
                    style={{ color: textSecondary }}
                  >
                    إزالة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export default Wishlist;
