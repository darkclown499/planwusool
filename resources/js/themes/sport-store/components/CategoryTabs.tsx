import React from 'react';

interface Category {
  id: string;
  name: string;
}

interface CategoryTabsProps {
  categories: Category[];
  onCategoryClick: (categoryId: string) => void;
  activeCategory: string;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ categories, onCategoryClick, activeCategory }) => {

  return (
    <div className="sticky top-20 z-40 bg-white border-b border-gray-200 px-4 py-3 md:bg-white md:border-gray-200 md:px-4 md:py-3">
      <div 
        className="flex gap-2 overflow-x-auto md:justify-center" 
        style={{
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
        onScroll={(e) => {
          const target = e.target as HTMLElement;
          target.style.setProperty('--webkit-scrollbar', 'none');
        }}
      >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category.id)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 md:px-5 md:py-2.5 md:shadow-sm md:border cursor-pointer ${
                activeCategory === category.id
                  ? 'bg-orange-600 text-white md:bg-orange-600 md:text-white md:border-orange-600'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200 md:bg-white md:text-gray-700 md:hover:bg-orange-50 md:hover:text-orange-600 md:border-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
    </div>
  );
};