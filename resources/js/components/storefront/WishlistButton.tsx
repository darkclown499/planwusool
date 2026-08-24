import React, { useState, useRef } from 'react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/custom-toast';

interface WishlistButtonProps {
  productId: string | number;
  className?: string;
  iconOnly?: boolean;
  label?: string;
}

interface FloatingHeart {
  id: number;
  x: number;
  delay: number;
  size: number;
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
  const [animating, setAnimating] = useState(false);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const counterRef = useRef(0);

  const triggerAnimation = () => {
    setAnimating(true);
    const newHearts: FloatingHeart[] = Array.from({ length: 5 }, (_, i) => ({
      id: counterRef.current++,
      x: (Math.random() - 0.5) * 28,
      delay: i * 70,
      size: 8 + Math.random() * 6,
    }));
    setHearts(newHearts);
    setTimeout(() => setAnimating(false), 600);
    setTimeout(() => setHearts([]), 900);
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    const willAdd = !active;
    if (willAdd) triggerAnimation();
    const added = await toggle(productId);
    if (added && !willAdd) {
      // edge case where optimistic mismatched, still animate if actually added
      triggerAnimation();
    }
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
        `relative flex items-center justify-center gap-1.5 rounded-full transition-colors cursor-pointer overflow-visible ${
          iconOnly ? 'p-2' : 'px-3 py-2 text-xs font-medium'
        } ${active ? 'bg-red-50 text-red-600' : 'bg-white text-gray-500 hover:text-red-500 hover:bg-red-50'}`
      }
    >
      <svg
        className={`${iconOnly ? 'w-5 h-5' : 'w-4 h-4'} transition-all duration-300 ease-out ${active ? 'fill-current text-red-500' : 'fill-none'} ${
          animating ? 'wishlist-bounce' : ''
        }`}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={
          animating
            ? ({
                animation: 'wishlist-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              } as React.CSSProperties)
            : undefined
        }
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {!iconOnly && <span className="transition-colors duration-300">{active ? 'في المفضلة' : label}</span>}

      {/* Floating hearts particles */}
      {hearts.map((h) => (
        <span
          key={h.id}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 text-red-500"
          style={
            {
              '--x': `${h.x}px`,
              fontSize: `${h.size}px`,
              animation: `wishlist-float 0.85s ease-out ${h.delay}ms forwards`,
            } as React.CSSProperties
          }
        >
          ❤
        </span>
      ))}

      <style>{`
        @keyframes wishlist-bounce {
          0% { transform: scale(1); }
          25% { transform: scale(1.32); }
          45% { transform: scale(0.88); }
          65% { transform: scale(1.18); }
          85% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        @keyframes wishlist-float {
          0% { transform: translate(-50%, -50%) translateX(var(--x)) scale(0.6); opacity: 1; }
          20% { opacity: 1; }
          100% { transform: translate(-50%, -90px) translateX(var(--x)) scale(1.15); opacity: 0; }
        }
      `}</style>
    </button>
  );
};
