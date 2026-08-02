import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  product_count?: number;
}

interface CategoryShowcaseProps {
  categories: Category[];
  onCategoryClick: (categoryId: string) => void;
  activeCategory?: string;
}

export const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({
  categories,
  onCategoryClick,
  activeCategory
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-amber-600',
      'bg-slate-700',
    ];
    return colors[index % colors.length];
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="bg-slate-100 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative">
          {/* Left Scroll Button */}
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 rtl-flip" />
          </button>

          {/* Categories Container */}
          <div 
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 mx-10" 
            style={{
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}
          >
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.id)}
                className={`flex-shrink-0 px-6 py-3 text-sm font-medium border-2 transition-all duration-200 min-w-fit ${
                  activeCategory === category.id
                    ? 'bg-amber-600 text-white border-amber-600'
                    : `${getCategoryColor(index)} text-white border-transparent hover:border-amber-300`
                }`}
              >
                {category.name}
                {category.product_count !== undefined && (
                  <span className="mr-2 text-xs opacity-80">({category.product_count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Right Scroll Button */}
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 rtl-flip" />
          </button>
        </div>
      </div>
    </section>
  );
};