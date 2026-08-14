import { ChevronLeft, ShoppingBag, Sparkles } from 'lucide-react';
import React from 'react';
import { WEFAQ_HERO_IMAGE } from '../mockData';

interface WefaqHeroProps {
    brandName: string;
    onShopNow: () => void;
}

export const WefaqHero: React.FC<WefaqHeroProps> = ({ brandName, onShopNow }) => {
    return (
        <section id="wefaq-hero" className="scroll-mt-28">
            <div className="relative overflow-hidden rounded-3xl">
                <img
                    src={WEFAQ_HERO_IMAGE}
                    alt="سوبر ماركت وفاق"
                    loading="eager"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-l from-[#1B5E20]/95 via-[#1B5E20]/80 to-[#2E7D32]/40" />

                <div className="relative z-10 flex flex-col items-start gap-4 px-6 py-16 text-white md:px-14 md:py-24">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold backdrop-blur md:text-sm">
                        <Sparkles className="h-4 w-4 text-yellow-300" />
                        سوبر ماركت {brandName} 2026
                    </span>
                    <h1 className="max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">
                        كل ما تحتاجه لعائلتك في مكان واحد
                    </h1>
                    <p className="max-w-xl text-sm leading-relaxed text-green-100 md:text-lg">
                        خضروات طازجة يومياً، ألبان وأجبان، لحوم طازجة، ومونة البيت — بأفضل الأسعار وأسرع توصيل حتى باب بيتك.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={onShopNow}
                            className="flex h-12 items-center gap-2 rounded-full bg-[#4CAF50] px-7 text-sm font-bold text-white shadow-xl transition hover:bg-[#43A047] active:scale-[0.98] md:text-base"
                        >
                            <ShoppingBag className="h-5 w-5" />
                            تسوق الآن
                        </button>
                        <a
                            href="#wefaq-recipe"
                            className="flex h-12 items-center gap-2 rounded-full border-2 border-white/70 px-6 text-sm font-bold text-white transition hover:bg-white/15 md:text-base"
                        >
                            وصفات اليوم
                            <ChevronLeft className="h-5 w-5" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WefaqHero;
