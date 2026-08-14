import { useStorefrontCore } from '@/templates/storefront';
import { Heart, LayoutGrid, Leaf, Search, ShoppingCart, User } from 'lucide-react';
import React, { useState } from 'react';
import { WEFAQ_NAV_LINKS, WEFAQ_SEARCH_PLACEHOLDER } from '../mockData';

interface WefaqHeaderProps {
    brandName: string;
    brandSub: string;
    cartCount: number;
    wishlistCount: number;
    isPreview: boolean;
}

export const WefaqHeader: React.FC<WefaqHeaderProps> = ({ brandName, brandSub, cartCount, wishlistCount, isPreview }) => {
    const { auth, ui, product: productCtx } = useStorefrontCore();
    const [query, setQuery] = useState('');

    const runSearch = (q: string) => {
        setQuery(q);
        if (isPreview) return;
        productCtx.handleSearch(q);
    };

    const openAccount = () => {
        if (auth.isLoggedIn) auth.setShowOrdersModal(true);
        else auth.setShowLoginModal(true);
    };

    const openWishlist = () => {
        if (typeof auth.setShowWishlistModal === 'function') auth.setShowWishlistModal(true);
    };

    return (
        <header className="sticky top-0 z-40 bg-white shadow-sm">
            {/* Top green strip */}
            <div className="bg-[#4CAF50] px-4 py-1.5 text-center text-xs font-medium text-white md:text-sm">
                توصيل مجاني للطلبات فوق 100₪ داخل المدينة &nbsp;•&nbsp; خصومات تصل إلى 30% هذا الأسبوع
            </div>

            {/* Main row */}
            <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
                <a href="#wefaq-hero" className="flex shrink-0 items-center gap-2">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4CAF50] text-white shadow">
                        <Leaf className="h-7 w-7" />
                    </span>
                    <span className="leading-tight">
                        <span className="block text-xl font-extrabold text-[#2E7D32]">{brandName}</span>
                        <span className="block text-[11px] font-semibold tracking-wide text-gray-500">{brandSub}</span>
                    </span>
                </a>

                <div className="relative hidden flex-1 items-center md:flex">
                    <Search className="absolute end-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        value={query}
                        onChange={(e) => runSearch(e.target.value)}
                        placeholder={WEFAQ_SEARCH_PLACEHOLDER}
                        className="h-12 w-full rounded-full border border-gray-200 bg-gray-50 ps-5 pe-12 text-sm text-gray-800 outline-none transition focus:border-[#4CAF50] focus:bg-white focus:ring-2 focus:ring-[#4CAF50]/30"
                    />
                </div>

                <div className="flex shrink-0 items-center gap-2 md:gap-3">
                    <button
                        type="button"
                        onClick={openAccount}
                        className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 lg:flex"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                            <User className="h-5 w-5" />
                        </span>
                        حساب
                    </button>

                    <button
                        type="button"
                        onClick={openWishlist}
                        className="relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                            <Heart className="h-5 w-5" />
                        </span>
                        <span className="hidden lg:inline">المفضلة</span>
                        {wishlistCount > 0 && (
                            <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                                {wishlistCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => ui.setShowCart(true)}
                        className="flex h-11 items-center gap-2 rounded-full bg-[#4CAF50] px-4 text-sm font-bold text-white shadow-md transition hover:bg-[#43A047] active:scale-[0.98]"
                    >
                        <ShoppingCart className="h-5 w-5" />
                        <span>السلة {isPreview ? 8 : cartCount}</span>
                        {!isPreview && cartCount > 0 && (
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1 text-xs">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile search */}
            <div className="px-4 pb-3 md:hidden">
                <div className="relative">
                    <Search className="absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        value={query}
                        onChange={(e) => runSearch(e.target.value)}
                        placeholder={WEFAQ_SEARCH_PLACEHOLDER}
                        className="h-11 w-full rounded-full border border-gray-200 bg-gray-50 ps-4 pe-10 text-sm text-gray-800 outline-none transition focus:border-[#4CAF50]"
                    />
                </div>
            </div>

            {/* Bottom nav */}
            <nav className="hidden bg-[#2E7D32] text-white md:block">
                <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-4">
                    <button
                        type="button"
                        className="flex h-11 shrink-0 items-center gap-2 rounded-t-lg bg-[#4CAF50] px-4 text-sm font-bold shadow-inner"
                    >
                        <LayoutGrid className="h-4 w-4" />
                        تصفح جميع الأقسام
                    </button>
                    <div className="flex items-center gap-1 overflow-x-auto">
                        {WEFAQ_NAV_LINKS.map((link) => (
                            <a
                                key={link.label}
                                href={`#${link.target}`}
                                className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-green-50 transition hover:bg-white/15 hover:text-white"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default WefaqHeader;
