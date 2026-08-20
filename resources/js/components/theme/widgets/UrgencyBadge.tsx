import React from 'react';
import { Flame } from 'lucide-react';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

interface UrgencyBadgeProps {
  /** 0..1 stock ratio drives the urgency level. */
  stockRatio?: number;
  level?: UrgencyLevel;
  suffix?: string;
  className?: string;
}

const LEVELS: Record<UrgencyLevel, { label: string; classes: string }> = {
  low: { label: 'متوفر', classes: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'متبقي القليل', classes: 'bg-amber-100 text-amber-700' },
  high: { label: 'كمية محدودة', classes: 'bg-orange-100 text-orange-700' },
  critical: { label: 'أغتنم الفرصة', classes: 'bg-rose-100 text-rose-700' },
};

/**
 * Scarcity badge shown when `enableUrgencyBadges` is on. The level derives from
 * the remaining stock ratio so low-stock items feel time-sensitive without
 * fabricating data.
 */
export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  stockRatio,
  level,
  suffix = '، اطلب الآن',
  className = '',
}) => {
  const effectiveLevel: UrgencyLevel =
    level ??
    (stockRatio === undefined
      ? 'low'
      : stockRatio <= 0.1
        ? 'critical'
        : stockRatio <= 0.3
          ? 'high'
          : stockRatio <= 0.6
            ? 'medium'
            : 'low');

  const { label, classes } = LEVELS[effectiveLevel];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${classes} ${className}`}>
      <Flame className="h-3 w-3" />
      {label}
      {effectiveLevel !== 'low' && suffix}
    </span>
  );
};