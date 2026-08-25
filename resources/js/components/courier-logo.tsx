import React, { useState } from 'react';
import { Truck, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  src?: string | null;
  name: string;
  size?: number; // 48 or 56
  className?: string;
}

export function CourierLogo({ src, name, size = 56, className }: Props) {
  const [failed, setFailed] = useState(false);
  const initials = name.substring(0, 2).toUpperCase();
  const dimension = size === 48 ? 'h-12 w-12' : 'h-14 w-14';
  const inner = size === 48 ? 'h-8 w-8' : 'h-9 w-9';

  if (!src || failed) {
    return (
      <div className={cn('rounded-xl border bg-white flex items-center justify-center shrink-0', dimension, className)}>
        <div className={cn('rounded-lg bg-slate-100 flex items-center justify-center', inner)}>
          <Package className="h-5 w-5 text-slate-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1.5', dimension, className)}>
      <img
        src={src}
        alt={name}
        className="max-h-full max-w-full object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
