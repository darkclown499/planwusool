import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  sku: string;
  stockQuantity: number;
  categoryId: string;
  category?: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  variants?: { name: string; options: string[] }[];
  customFields?: { name: string; value: string }[];
  taxName?: string;
  taxPercentage?: number;
}

interface Category {
  id: string;
  name: string;
}

interface ProductContextType {
  products: Product[];
  categories: Category[];
  filteredProducts: Product[];
  activeCategory: string;
  searchQuery: string;
  selectedProduct: Product | null;
  selectedImageIndex: number;
  showProductDetail: boolean;
  setActiveCategory: (categoryId: string) => void;
  handleSearch: (query: string) => void;
  handleProductClick: (product: Product) => void;
  handleCloseProductDetail: () => void;
  handleImageSelect: (index: number) => void;
  handleCategoryClick: (categoryId: string) => void;
  groupProductsByCategory: () => { [key: string]: Product[] };
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

interface ProductProviderProps {
  children: ReactNode;
  products: Product[];
  categories: Category[];
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ 
  children, 
  products, 
  categories 
}) => {
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(query.toLowerCase())) ||
        product.price.toString().includes(query)
      );
      setFilteredProducts(filtered);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
    setSelectedImageIndex(0);
  };

  const handleCloseProductDetail = () => {
    setShowProductDetail(false);
    setSelectedProduct(null);
    setSelectedImageIndex(0);
  };

  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCategoryClick = (categoryId: string) => {
    setIsScrolling(true);
    setActiveCategory(categoryId);
    const categoryElement = document.getElementById(`category-${categoryId}`);
    if (categoryElement) {
      categoryElement.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => setIsScrolling(false), 1000);
    }
  };

  const groupProductsByCategory = () => {
    const grouped: { [key: string]: Product[] } = {};
    categories.forEach(category => {
      grouped[category.id] = products.filter(product => product.categoryId === category.id);
    });
    return grouped;
  };

  // Handle scroll-based category detection
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      if (isScrolling) return;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const categoryElements = categories.map(cat => ({
          id: cat.id,
          element: document.getElementById(`category-${cat.id}`)
        })).filter(item => item.element);

        const scrollPosition = window.scrollY + 200;
        
        for (let i = categoryElements.length - 1; i >= 0; i--) {
          const { id, element } = categoryElements[i];
          if (element && element.offsetTop <= scrollPosition) {
            setActiveCategory(id);
            break;
          }
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [categories, isScrolling]);

  const value: ProductContextType = {
    products,
    categories,
    filteredProducts,
    activeCategory,
    searchQuery,
    selectedProduct,
    selectedImageIndex,
    showProductDetail,
    setActiveCategory,
    handleSearch,
    handleProductClick,
    handleCloseProductDetail,
    handleImageSelect,
    handleCategoryClick,
    groupProductsByCategory
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};