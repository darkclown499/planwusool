import { useTranslation } from 'react-i18next';
import { CircleDollarSign, Percent } from 'lucide-react';
import { formatCurrency } from '@/utils/currency-helper';

interface ProfitSummaryProps {
  costPrice?: string | number;
  sellingPrice?: string | number;
}

/**
 * Live profit calculator shown under the pricing inputs.
 * Net profit = selling price - cost price; margin % is measured on the
 * selling price (the standard profit-margin convention).
 */
export function ProfitSummary({ costPrice, sellingPrice }: ProfitSummaryProps) {
  const { t } = useTranslation();

  const cost = parseFloat(String(costPrice ?? '')) || 0;
  const selling = parseFloat(String(sellingPrice ?? '')) || 0;

  const netProfit = selling - cost;
  const marginPct = selling > 0 ? (netProfit / selling) * 100 : 0;

  const positive = netProfit > 0;
  const neutral = netProfit === 0;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border p-4 ${
      positive
        ? 'border-emerald-200 bg-emerald-50/70'
        : neutral
          ? 'border-gray-200 bg-gray-50/70'
          : 'border-red-200 bg-red-50/70'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${positive ? 'bg-emerald-100 text-emerald-600' : neutral ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'}`}>
          <CircleDollarSign className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{t('Net Profit')}</p>
          <p className={`truncate text-base font-bold ${positive ? 'text-emerald-700' : neutral ? 'text-gray-700' : 'text-red-700'}`}>
            {formatCurrency(netProfit)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${positive ? 'bg-emerald-100 text-emerald-600' : neutral ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'}`}>
          <Percent className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{t('Profit Margin %')}</p>
          <p className={`truncate text-base font-bold ${positive ? 'text-emerald-700' : neutral ? 'text-gray-700' : 'text-red-700'}`}>
            {marginPct.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}