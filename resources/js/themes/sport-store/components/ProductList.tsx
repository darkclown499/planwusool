import React from 'react';
import { ProductCard } from './ProductCard';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  discount?: number;
  categoryId: string;
}

interface ProductListProps {
  products: Product[];
  currency: string;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, currency, onAddToCart, onProductClick }) => {
  return (
    <div className="bg-white md:bg-white">
      {/* Mobile: Vertical list */}
      <div className="md:hidden">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            currency={currency}
            onAddToCart={onAddToCart}
            onProductClick={onProductClick}
          />
        ))}
      </div>
      
      {/* Desktop: Grid layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            currency={currency}
            onAddToCart={onAddToCart}
            onProductClick={onProductClick}
          />
        ))}
      </div>
    </div>
  );
};