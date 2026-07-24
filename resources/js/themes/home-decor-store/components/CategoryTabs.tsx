import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  product_count?: number;
}

interface CategoryTabsProps {
  categories: Category[];
  onCategoryClick: (categoryId: string) => void;
  activeCategory: string;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  onCategoryClick,
  activeCategory
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Category icons mapping for home décor theme
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('sofa') || name.includes('chair') || name.includes('seating')) return '🛋️';
    if (name.includes('bed') || name.includes('bedroom')) return '🛏️';
    if (name.includes('table') || name.includes('dining')) return '🪑';
    if (name.includes('lamp') || name.includes('light')) return '💡';
    if (name.includes('decor') || name.includes('decoration')) return '🎨';
    if (name.includes('storage') || name.includes('cabinet')) return '🗄️';
    if (name.includes('mirror')) return '🪞';
    if (name.includes('rug') || name.includes('carpet')) return '🏠';
    return '🏡';
  };

  return (
    <div className="sticky top-[80px] md:top-[100px] z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="relative">
          {/* Left Scroll Button */}
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 md:p-2 bg-white shadow-lg rounded-full border border-amber-200 hover:bg-amber-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-amber-700" />
          </button>

          {/* Categories Container */}
          <div
            ref={scrollContainerRef}
            className="flex space-x-2 overflow-x-auto scrollbar-hide px-8 md:px-12 py-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.id)}
                className={`
                  flex-shrink-0 flex items-center space-x-2 md:space-x-3 px-3 md:px-6 py-2 md:py-3 rounded-full font-medium whitespace-nowrap
                  ${activeCategory === category.id
                    ? 'bg-amber-600 text-white shadow-lg transition-all duration-200'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 hover:shadow-md transition-colors duration-200'
                  }
                `}
              >
                <span className="font-semibold text-sm md:text-base">{category.name}</span>
                {category.product_count !== undefined && (
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                    activeCategory === category.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-amber-200 text-amber-800'
                  }`}>
                    {category.product_count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right Scroll Button */}
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 md:p-2 bg-white shadow-lg rounded-full border border-amber-200 hover:bg-amber-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-amber-700" />
          </button>
        </div>


      </div>

      {/* Decorative Bottom Border */}
      <div className="h-1 bg-amber-300"></div>
    </div>
  );
};