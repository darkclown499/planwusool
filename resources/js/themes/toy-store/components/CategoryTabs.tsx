import React, { useRef, useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
}

interface CategoryTabsProps {
  categories: Category[];
  onCategoryClick: (categoryId: string) => void;
  activeCategory: string | null;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  onCategoryClick,
  activeCategory,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

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

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [categories]);

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const headerHeight = 128;
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    onCategoryClick(categoryId);
    scrollToCategory(categoryId);
  };

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-16 md:top-20 z-40 bg-purple-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="py-3 md:py-6">
          <div
            ref={scrollContainerRef}
            className="flex space-x-2 md:space-x-4 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={checkScrollButtons}
          >
            {categories.map((category) => (
              <div key={category.id} className="flex-shrink-0">
                <button
                  onClick={() => handleCategoryClick(category.id)}
                  className={`block px-4 py-2 md:px-8 md:py-4 rounded-t-xl md:rounded-t-2xl font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap border-b-2 md:border-b-4 ${
                    activeCategory === category.id
                      ? 'bg-white text-purple-700 border-green-400 shadow-lg transform -translate-y-1'
                      : 'bg-purple-400 text-white border-transparent hover:bg-purple-300 hover:transform hover:-translate-y-0.5'
                  }`}
                >
                  {category.name}
                </button>
              </div>
            ))}
          </div>
          {(canScrollLeft || canScrollRight) && (
            <div className="flex justify-center gap-2 md:gap-4 mt-2 md:mt-4">
              {canScrollLeft && (
                <button
                  onClick={scrollLeft}
                  className="bg-pink-400 hover:bg-pink-500 text-white rounded-full p-2 md:p-3 shadow-lg transform hover:scale-110 transition-all duration-200"
                >
                  <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {canScrollRight && (
                <button
                  onClick={scrollRight}
                  className="bg-green-400 hover:bg-green-500 text-white rounded-full p-2 md:p-3 shadow-lg transform hover:scale-110 transition-all duration-200"
                >
                  <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};