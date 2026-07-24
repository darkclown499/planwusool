import React from 'react';
import { useStoreCurrency, useCurrencyFormatter } from '@/hooks/use-store-currency';

interface CurrencyDisplayProps {
  amount: number | string;
  className?: string;
}

/**
 * Component to display currency using store-specific formatting
 */
export function CurrencyDisplay({ amount, className }: CurrencyDisplayProps) {
  const formatCurrency = useCurrencyFormatter();
  
  return (
    <span className={className}>
      {formatCurrency(amount)}
    </span>
  );
}

/**
 * Hook-based currency display for inline usage
 */
export function useCurrencyDisplay() {
  const formatCurrency = useCurrencyFormatter();
  const storeCurrency = useStoreCurrency();
  
  return {
    formatCurrency,
    currencyCode: storeCurrency.code,
    currencySymbol: storeCurrency.symbol,
    currencyName: storeCurrency.name
  };
}

/**
 * Example usage component
 */
export function CurrencyExample() {
  const { formatCurrency, currencyCode, currencySymbol } = useCurrencyDisplay();
  
  return (
    <div className="space-y-2">
      <p>Current Currency: {currencyCode} ({currencySymbol})</p>
      <p>Price: <CurrencyDisplay amount={1234.56} className="font-semibold" /></p>
      <p>Total: {formatCurrency(999.99)}</p>
    </div>
  );
}