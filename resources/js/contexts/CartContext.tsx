import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from '@/components/custom-toast';
import { route } from 'ziggy-js';

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
  availability: 'in_stock' | 'out_of_stock';
  taxName?: string;
  taxPercentage?: number;
  description?: string;
  variants?: { name: string; options: string[] }[];
  customFields?: { name: string; value: string }[];
}

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartLoading: boolean;
  cartError: string | null;
  addToCart: (product: Product) => Promise<void>;
  removeFromCart: (index: number) => Promise<void>;
  updateQuantity: (index: number, change: number) => Promise<void>;
  setQuantity: (index: number, quantity: number) => Promise<void>;
  loadCart: () => Promise<void>;
  syncGuestCart: () => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
  storeId?: string | number;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children, storeId }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const loadCart = async () => {
    if (!storeId) return;
    
    try {
      setCartError(null);
      const response = await fetch(`${route('api.cart.index')}?store_id=${storeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.items) {
        setCartItems(data.items);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      setCartError('Failed to load cart. Please try again.');
    }
  };

  const addToCart = async (product: Product & { selectedVariants?: {[key: string]: string}, quantity?: number }) => {
    setCartLoading(true);
    try {
      const response = await fetch(route('api.cart.add'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          store_id: storeId,
          product_id: product.id,
          quantity: product.quantity || 1,
          variants: product.selectedVariants || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add to cart');
      }
      
      const data = await response.json();
      
      // Store session ID for guest users
      if (data.item?.session_id) {
        sessionStorage.setItem('guest_session_id', data.item.session_id);
      }
      
      await loadCart();
      toast.success(data.message || 'Product added to cart!');
      
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add product to cart. Please try again.');
    } finally {
      setCartLoading(false);
    }
  };

  const removeFromCart = async (index: number) => {
    const item = cartItems[index];
    setCartLoading(true);
    try {
      const response = await fetch(route('api.cart.remove', { id: item.id }), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({ store_id: storeId })
      });
      if (response.ok) {
        await loadCart();
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
    } finally {
      setCartLoading(false);
    }
  };

  const updateQuantity = async (index: number, change: number) => {
    const item = cartItems[index];
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }
    
    if (newQuantity > item.stockQuantity) {
      toast.error(`Only ${item.stockQuantity} items available in stock`);
      return;
    }
    
    await setQuantity(index, newQuantity);
  };

  const setQuantity = async (index: number, quantity: number) => {
    const item = cartItems[index];
    
    if (quantity <= 0) return;
    
    if (quantity > item.stockQuantity) {
      toast.error(`Only ${item.stockQuantity} items available in stock`);
      return;
    }
    
    setCartLoading(true);
    try {
      const response = await fetch(route('api.cart.update', { id: item.id }), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          store_id: storeId,
          quantity: quantity
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }
      
      await loadCart();
    } catch (error) {
      console.error('Failed to update cart:', error);
      toast.error('Failed to update quantity. Please try again.');
    } finally {
      setCartLoading(false);
    }
  };

  const syncGuestCart = async () => {
    if (!storeId || cartItems.length === 0) return;
    
    try {
      const response = await fetch(route('api.cart.sync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          store_id: storeId,
          guest_session_id: sessionStorage.getItem('guest_session_id'),
          items: cartItems.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            variants: item.variants
          }))
        })
      });
      
      if (response.ok) {
        await loadCart();
      }
    } catch (error) {
      console.error('Failed to sync cart:', error);
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Load cart on mount and when storeId changes
  useEffect(() => {
    if (storeId) {
      loadCart();
    }
  }, [storeId]);

  const value: CartContextType = {
    cartItems,
    cartLoading,
    cartError,
    addToCart,
    removeFromCart,
    updateQuantity,
    setQuantity,
    loadCart,
    syncGuestCart,
    clearCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};