import React from 'react';
import { useMasalahTheme } from '../MasalahThemeProvider';
import { ProductCard } from './ProductCard';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  sku: string;
  stockQuantity: number;
  categoryId: string;
  availability: 'in_stock' | 'out_of_stock';
  variants?: Array<{ name: string; values?: string[]; options?: string[] }>;
  customFields?: { name: string; value: string }[];
}

interface ProductGridProps {
  id?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  onAddToCart: (product: any) => void;
  onProductClick: (product: Product) => void;
}

const gridColsClasses: Record<number, string> = {
  4: 'md:grid-cols-2 lg:grid-cols-4',
  5: 'md:grid-cols-3 lg:grid-cols-5'
};

export const ProductGrid: React.FC<ProductGridProps> = ({
  id,
  title,
  subtitle,
  products,
  onAddToCart,
  onProductClick
}) => {
  const theme = useMasalahTheme();
  const colsClass = gridColsClasses[theme.layout.gridCols] || 'md:grid-cols-2 lg:grid-cols-4';

  if (!products || products.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <span
          className="h-8 w-1.5 rounded-full"
          style={{ background: theme.colors.primary }}
        />
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div className={`grid grid-cols-2 ${colsClass} gap-3 md:gap-4`}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            onProductClick={onProductClick}
          />
        ))}
      </div>
    </section>
  );
};
