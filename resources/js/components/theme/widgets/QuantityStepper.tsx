import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  quantity: number;
  stock: number;
  onDecrease: () => void;
  onIncrease: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Inline quantity stepper used by bulk-add style cards. Also powers the line
 * item quantity controls inside the cart slots so all +/- controls behave the
 * same (stock-guarded through the shared cart context).
 */
export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  quantity,
  stock,
  onDecrease,
  onIncrease,
  size = 'md',
  className = '',
}) => {
  const btn = 'flex items-center justify-center rounded-full bg-white text-gray-700 border border-gray-200 shadow-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed';
  const sizing =
    size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const reachedMin = quantity <= 1;
  const reachedMax = quantity >= stock;

  return (
    <div className={`inline-flex items-center gap-1 rounded-full bg-gray-50 p-1 ${className}`}>
      <button
        type="button"
        aria-label="تقليل الكمية"
        disabled={reachedMin}
        onClick={onDecrease}
        className={`${btn} ${sizing}`}
      >
        <Minus className={icon} />
      </button>
      <span className={`min-w-8 text-center font-bold text-gray-900 ${size === 'lg' ? 'text-base' : 'text-sm'}`}>
        {quantity}
      </span>
      <button
        type="button"
        aria-label="زيادة الكمية"
        disabled={reachedMax}
        onClick={onIncrease}
        className={`${btn} ${sizing}`}
      >
        <Plus className={icon} />
      </button>
    </div>
  );
};