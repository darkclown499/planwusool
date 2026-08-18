import React, { forwardRef } from 'react';
import { useStoreCurrency } from '@/hooks/use-store-currency';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Number input with the store's currency symbol rendered inline on the
 * correct side (start/end per store settings) using logical properties so
 * it mirrors properly between RTL and LTR layouts.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, ...props }, ref) => {
    const currency = useStoreCurrency();
    const position = currency.position;

    return (
      <div className="relative">
        {position !== 'after' && (
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm font-medium text-muted-foreground">
            {currency.symbol}
          </span>
        )}
        <Input
          ref={ref}
          className={cn(position === 'after' ? 'pe-9' : 'ps-9', className)}
          {...props}
        />
        {position === 'after' && (
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-medium text-muted-foreground">
            {currency.symbol}
          </span>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';