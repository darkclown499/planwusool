import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface WishlistItem {
  id: string | number;
  product_id: string | number;
  name: string;
  price: number;
  sale_price?: number;
  cover_image?: string;
  stock?: number;
  is_active?: boolean;
  category?: { id: string | number; name: string } | null;
}

interface WishlistContextType {
  items: WishlistItem[];
  count: number;
  wishlistCount: number;
  loading: boolean;
  isInWishlist: (productId: string | number) => boolean;
  toggle: (productId: string | number) => Promise<boolean>;
  remove: (id: string | number) => Promise<void>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

interface WishlistProviderProps {
  children: ReactNode;
  storeId: string | number;
  isLoggedIn: boolean;
}

export const WishlistProvider: React.FC<WishlistProviderProps> = ({ children, storeId, isLoggedIn }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const csrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const response = await fetch(route('api.wishlist.index', { store_id: storeId }), {
        headers: { 'X-CSRF-TOKEN': csrfToken() }
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    refresh();
  }, [storeId, isLoggedIn, refresh]);

  const isInWishlist = useCallback(
    (productId: string | number) => items.some((item) => String(item.product_id) === String(productId)),
    [items]
  );

  const toggle = useCallback(
    async (productId: string | number) => {
      if (!storeId) return false;
      try {
        const response = await fetch(route('api.wishlist.toggle'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken()
          },
          body: JSON.stringify({ store_id: storeId, product_id: productId })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.action === 'added') {
            await refresh();
          } else {
            setItems((prev) => prev.filter((item) => String(item.product_id) !== String(productId)));
          }
          return data.action === 'added';
        }
      } catch (error) {
        console.error('Wishlist toggle failed:', error);
      }
      return false;
    },
    [storeId, refresh]
  );

  const remove = useCallback(async (id: string | number) => {
    try {
      await fetch(route('api.wishlist.remove', { id }), {
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': csrfToken() }
      });
      setItems((prev) => prev.filter((item) => String(item.id) !== String(id)));
    } catch (error) {
      console.error('Wishlist remove failed:', error);
    }
  }, []);

  const value: WishlistContextType = {
    items,
    count: items.length,
    wishlistCount: items.length,
    loading,
    isInWishlist,
    toggle,
    remove,
    refresh
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
