import React from 'react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/custom-toast';

interface WishlistButtonProps {
  productId: string | number;
  className?: string;
  iconOnly?: boolean;
  label?: string;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  className = '',
  iconOnly = true,
  label = 'المفضلة'
}) => {
  const { isInWishlist, toggle, loading } = useWishlist();
  const { isLoggedIn, setShowLoginModal } = useAuth();
  const active = isInWishlist(productId);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    const added = await toggle(productId);
    toast.success(added ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      title={active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      className={
        className ||
        `flex items-center justify-center gap-1.5 rounded-full transition-colors cursor-pointer ${
          iconOnly ? 'p-2' : 'px-3 py-2 text-xs font-medium'
        } ${active ? 'bg-red-50 text-red-600' : 'bg-white text-gray-500 hover:text-red-500 hover:bg-red-50'}`
      }
    >
      <svg
        className={`${iconOnly ? 'w-5 h-5' : 'w-4 h-4'} ${active ? 'fill-current' : ''}`}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {!iconOnly && <span>{active ? 'في المفضلة' : label}</span>}
    </button>
  );
};
