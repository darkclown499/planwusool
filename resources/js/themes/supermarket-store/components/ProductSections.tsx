import React from 'react';
import { Plus, Star, Tag, Truck } from 'lucide-react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  categoryId: string;
  availability: 'in_stock' | 'out_of_stock';
  stockQuantity: number;
  variants?: { name: string; options: string[] }[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface ProductSectionsProps {
  categories: Category[];
  groupedProducts: { [categoryId: string]: Product[] };
  filteredProducts: Product[];
  searchQuery: string;
  currency: string;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

const ProductCard: React.FC<{
  product: Product;
  currency: string;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}> = ({ product, currency, onAddToCart, onProductClick }) => {
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  
  const isOnSale = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = isOnSale 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 group overflow-hidden border border-gray-200">
      {/* Product Image */}
      <div className="relative aspect-square bg-gradient-to-br from-green-50 to-green-100 overflow-hidden">
        <img
          src={getImageUrl(product.image)}
          alt={product.name}
          className="w-full h-full object-scale-down cursor-pointer group-hover:scale-110 transition-transform duration-500"
          onClick={() => onProductClick(product)}
        />
        
        {/* Sale Badge */}
        {isOnSale && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            -{discountPercentage}% OFF
          </div>
        )}
        
        {/* Variant Badge */}
        {product.variants && product.variants.length > 0 && (
          <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
            Variants
          </div>
        )}
        
        {/* Out of Stock Overlay */}
        {product.availability === 'out_of_stock' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
              Out of Stock
            </span>
          </div>
        )}
        

      </div>

      {/* Product Info */}
      <div>
        <button
          onClick={() => {
            if (product.variants && product.variants.length > 0) {
              onProductClick(product);
            } else {
              onAddToCart(product);
            }
          }}
          disabled={product.availability === 'out_of_stock'}
          className={`w-full font-medium py-2.5 transition-colors text-sm cursor-pointer mb-3 ${
            product.availability === 'in_stock'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {product.availability === 'out_of_stock' ? 'Out of Stock' : 
           product.variants && product.variants.length > 0 ? 'Select Options' : 'Add to Cart'
          }
        </button>
        
        <div className="px-5 pb-5">
          <h3 
            onClick={() => onProductClick(product)}
            className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-5 cursor-pointer hover:text-green-600"
          >
            {product.name}
          </h3>
          
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(product.price, storeSettings, currencies)}
            </span>
            
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(product.originalPrice, storeSettings, currencies)}
              </span>
            )}
          </div>
          
          <p className="text-xs text-gray-500">SKU: {product.id}</p>
        </div>
      </div>
    </div>
  );
};

export const ProductSections: React.FC<ProductSectionsProps> = ({
  categories,
  groupedProducts,
  filteredProducts,
  searchQuery,
  currency,
  onAddToCart,
  onProductClick
}) => {
  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {searchQuery ? (
          // Search Results
          <div>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Search Results for "{searchQuery}"
              </h2>
              <p className="text-gray-600">
                Found {filteredProducts.length} products
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currency={currency}
                  onAddToCart={onAddToCart}
                  onProductClick={onProductClick}
                />
              ))}
            </div>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600">
                  Try searching with different keywords
                </p>
              </div>
            )}
          </div>
        ) : (
          // Category Sections
          <div className="space-y-16">
            {categories.map((category) => {
              const categoryProducts = groupedProducts[category.id] || [];
              
              if (categoryProducts.length === 0) return null;
              
              return (
                <section key={category.id} id={`category-${category.id}`}>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {category.name}
                      </h2>
                      <p className="text-gray-600">
                        {category.description || `Fresh and quality ${category.name.toLowerCase()} for your family`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Products Grid */}
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {categoryProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        currency={currency}
                        onAddToCart={onAddToCart}
                        onProductClick={onProductClick}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};