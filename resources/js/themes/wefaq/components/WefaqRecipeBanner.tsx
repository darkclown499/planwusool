import { Plus, Salad, UtensilsCrossed } from 'lucide-react';
import React from 'react';
import { WEFAQ_RECIPE_IMAGE } from '../mockData';

interface WefaqRecipeBannerProps {
    onAddRecipe: () => void;
    added: boolean;
}

export const WefaqRecipeBanner: React.FC<WefaqRecipeBannerProps> = ({ onAddRecipe, added }) => {
    return (
        <section id="wefaq-recipe" className="scroll-mt-28">
            <div className="grid overflow-hidden rounded-3xl border border-green-100 bg-gradient-to-l from-[#E8F5E9] to-[#C8E6C9] md:grid-cols-2">
                <div className="flex flex-col items-start justify-center gap-3 p-6 md:p-10">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#2E7D32] shadow-sm md:text-sm">
                        <Salad className="h-4 w-4" />
                        وصفة اليوم
                    </span>
                    <h2 className="text-2xl font-extrabold text-[#1B5E20] md:text-4xl">سلطة فواكه موسمية</h2>
                    <p className="text-sm leading-relaxed text-[#33691E] md:text-base">
                        فراولة، موز وتفاح أحمر طازج مع القليل من العسل الجبلي — وجبة خفيفة منعشة ومليئة بالفيتامينات.
                    </p>
                    <button
                        type="button"
                        onClick={onAddRecipe}
                        disabled={added}
                        className={`flex h-12 items-center gap-2 rounded-full px-7 text-sm font-bold shadow-md transition md:text-base ${
                            added
                                ? 'bg-[#43A047] text-white'
                                : 'bg-[#007BFF] text-white hover:bg-[#0056b3] active:scale-[0.98]'
                        }`}
                    >
                        {added ? (
                            <>
                                <UtensilsCrossed className="h-5 w-5" />
                                أُضيفت المكونات إلى السلة
                            </>
                        ) : (
                            <>
                                <Plus className="h-5 w-5" />
                                أضف المكونات إلى السلة
                            </>
                        )}
                    </button>
                </div>
                <div className="relative min-h-56 md:min-h-72">
                    <img
                        src={WEFAQ_RECIPE_IMAGE}
                        alt="سلطة فواكه موسمية"
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            </div>
        </section>
    );
};

export default WefaqRecipeBanner;
