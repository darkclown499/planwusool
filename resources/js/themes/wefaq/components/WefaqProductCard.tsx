import { useStorefrontCore } from '@/templates/storefront';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { WEFAQ_FALLBACK_IMAGE } from '../mockData';

interface WefaqProductCardProps {
    product: any;
}

function ratingFor(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) % 997;
    }
    return 4 + (hash % 10) / 10;
}

export const WefaqProductCard: React.FC<WefaqProductCardProps> = ({ product }) => {
    const { cart, product: productCtx, wishlist } = useStorefrontCore();
    const [fav, setFav] = useState(false);

    const name = product.name || product.title || 'منتج جديد';
    const price = Number(product.price) || 0;
    const oldPrice = Number(product.originalPrice || product.sale_price || product.old_price || 0);
    const rating = useMemo(() => ratingFor(String(product.id || name)), [product.id, name]);

    const open = () => productCtx.handleProductClick(product);
    const addToCart = () => cart.addToCart(product);

    const toggleFav = async () => {
        const next = await wishlist?.toggle?.(product);
        if (typeof next === 'boolean') setFav(next);
        else setFav((v) => !v);
    };

    const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
    const isNew = product.tags?.includes('new');
    const isOrganic = product.tags?.includes('organic');

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="relative">
                <div className="absolute start-3 top-3 z-10 flex flex-col items-center gap-2">
                    <button
                        type="button"
                        aria-label="أضف إلى المفضلة"
                        onClick={toggleFav}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow transition hover:text-red-500"
                    >
                        <Heart className="h-5 w-5" fill={fav ? '#ef4444' : 'none'} color={fav ? '#ef4444' : 'currentColor'} />
                    </button>
                    {discount > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                            -{discount}%
                        </span>
                    )}
                </div>
                {isNew && (
                    <span className="absolute end-3 top-3 rounded-full bg-[#007BFF] px-2 py-0.5 text-[11px] font-bold text-white shadow">
                        جديد
                    </span>
                )}
                {isOrganic && (
                    <span className="absolute end-3 top-12 rounded-full bg-[#4CAF50] px-2 py-0.5 text-[11px] font-bold text-white shadow">
                        عضوي
                    </span>
                )}
                <button type="button" onClick={open} className="block w-full cursor-pointer">
                    <img
                        src={getImageUrl(product.image) || WEFAQ_FALLBACK_IMAGE}
                        alt={name}
                        loading="lazy"
                        onError={(e) => {
                            const el = e.currentTarget;
                            if (el.src !== WEFAQ_FALLBACK_IMAGE) el.src = WEFAQ_FALLBACK_IMAGE;
                        }}
                        className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                </button>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-3 md:p-4">
                <button type="button" onClick={open} className="cursor-pointer text-start">
                    <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-gray-900 hover:text-[#4CAF50]">
                        {name}
                    </h3>
                </button>

                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                            key={i}
                            className="h-3.5 w-3.5"
                            fill={i <= Math.round(rating) ? '#FFC107' : 'none'}
                            color="#FFC107"
                        />
                    ))}
                    <span className="ms-1 text-xs font-semibold text-gray-500">{rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({Math.round(rating * 24 + 8)})</span>
                </div>

                <div className="mt-auto flex items-baseline gap-2">
                    <span className="text-lg font-extrabold text-red-600">{formatStoreCurrency(price)}</span>
                    {oldPrice > price && (
                        <span className="text-sm font-medium text-gray-400 line-through">{formatStoreCurrency(oldPrice)}</span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={addToCart}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#007BFF] py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0056b3] active:scale-[0.98]"
                >
                    <ShoppingCart className="h-4 w-4" />
                    + إضافة إلى السلة
                </button>
            </div>
        </div>
    );
};

export default WefaqProductCard;
