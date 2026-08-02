import React from 'react';

// Add scrollbar-hide utility to index.css if not present
// .scrollbar-hide {
//   -ms-overflow-style: none;
//   scrollbar-width: none;
// }
// .scrollbar-hide::-webkit-scrollbar {
//   display: none;
// }

interface Category {
  id: string;
  name: string;
}

interface CategoryTabsProps {
  categories: Category[];
  onCategoryClick: (categoryId: string) => void;
  activeCategory?: string;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  categories, 
  onCategoryClick, 
  activeCategory 
}) => {

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-16 md:top-20 z-40 bg-white py-4 md:py-6 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">


        {/* Categories Grid */}
        <div className="flex gap-3 justify-center md:flex-wrap md:justify-center overflow-x-auto scrollbar-hide pb-2 pl-13 md:pl-0">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category.id)}
              className={`flex-shrink-0 px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeCategory === category.id
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-red-300 hover:text-red-600 hover:shadow-sm'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>


      </div>
    </div>
  );
};