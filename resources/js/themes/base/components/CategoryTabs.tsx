import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/hooks/useCategories';

interface BaseCategoryTabsProps {
  categories: Array<{ id: string; name: string; product_count?: number }>;
  activeId: string;
  onSelect: (id: string) => void;
  brandColor?: string;
  showCounts?: boolean;
  className?: string;
}

export const BaseCategoryTabs: React.FC<BaseCategoryTabsProps> = ({
  categories,
  activeId,
  onSelect,
  brandColor = '#10b77f',
  showCounts = true,
  className,
}) => {
  const { t } = useTranslation();

  if (!categories.length) return null;

  return (
    <div
      className={cn(
        'sticky top-24 z-40 bg-white border-r border-gray-200',
        'hidden lg:block',
        className
      )}
      style={{ borderColor: 'var(--theme-color)' }}
    >
      <nav className="p-4 space-y-2" aria-label={t('Categories')}>
        <button
          onClick={() => onSelect('all')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            activeId === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
          )}
          style={{
            backgroundColor: activeId === 'all' ? 'var(--theme-color)' : undefined,
          }}
        >
          <span>{t('All Products')}</span>
          {showCounts && (
            <span className={cn(
              'px-2 py-0.5 text-xs rounded-full',
              activeId === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            )}>
              {categories.reduce((sum, c) => sum + (c.product_count || 0), 0)}
            </span>
          )}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeId === category.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
            )}
            style={{
              backgroundColor: activeId === category.id ? 'var(--theme-color)' : undefined,
            }}
          >
            <span>{category.name}</span>
            {showCounts && (
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                activeId === category.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              )}>
                {category.product_count || 0}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default BaseCategoryTabs;