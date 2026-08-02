import React from 'react';

interface Category {
  id: string;
  name: string;
  description?: string;
  product_count?: number;
}

interface CategoryGridProps {
  categories: Category[];
  onCategoryClick: (categoryId: string) => void;
  activeCategory?: string;
}



// Category colors for variety
const getCategoryColor = (index: number): string => {
  const colors = [
    'bg-orange-500',
    'bg-orange-500', 
    'bg-blue-500',
    'bg-purple-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-cyan-500'
  ];
  return colors[index % colors.length];
};

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onCategoryClick,
  activeCategory
}) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="py-3 md:py-6 bg-white sticky top-16 md:top-20 z-30">
      <div className="max-w-7xl mx-auto px-4">

        {/* Categories Grid */}
        <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100 hover:scrollbar-thumb-orange-400 p-2">
          {categories.map((category, index) => (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category.id)}
              className={`group relative overflow-hidden rounded-2xl p-3 md:p-4 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl min-w-[120px] md:min-w-[140px] flex-shrink-0 ${
                activeCategory === category.id 
                  ? 'ring-4 ring-orange-500 ring-opacity-50' 
                  : ''
              }`}
            >
              {/* Background */}
              <div className={`absolute inset-0 ${getCategoryColor(index)} opacity-90 group-hover:opacity-100 transition-opacity`} />
              
              {/* Content */}
              <div className="relative z-10 text-white">

                
                {/* Category Name */}
                <h3 className="font-bold text-sm md:text-base mb-1 leading-tight">
                  {category.name}
                </h3>
                
                {/* Product Count */}
                {category.product_count !== undefined && (
                  <p className="text-xs opacity-90">
                    {category.product_count} منتجات
                  </p>
                )}
              </div>

              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
              
              {/* Active Indicator */}
              {activeCategory === category.id && (
                <div className="absolute top-2 left-2 w-3 h-3 bg-white rounded-full shadow-lg" />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};