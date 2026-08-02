import React, { useRef } from 'react';

interface Category {
  id: string;
  name: string;
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

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
    onCategoryClick(categoryId);
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-16 z-40 bg-stone-50 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 md:px-4">
        <div
          ref={scrollContainerRef}
          className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                style={{ cursor: 'pointer' }}
                className={`
                  flex-shrink-0 flex flex-col items-center p-3 md:p-4 min-w-[80px] md:min-w-[100px] rounded-lg transition-all duration-300 border
                  ${isActive
                    ? 'bg-amber-600 text-white border-amber-700 shadow-md'
                    : 'bg-white text-amber-800 border-stone-200 hover:border-amber-400 hover:bg-stone-100 hover:shadow-sm'
                  }
                `}
              >
                <span className="text-xs md:text-sm font-medium text-center whitespace-nowrap">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};