import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { css } from '@/builder/sections/helpers';

/**
 * Shared bottom-sheet/modal shell for the family's account overlays
 * (order success, orders, order detail, profile, wishlist) — flat header,
 * hairline border, sharp corners, no colored icon chip (the icon itself
 * carries the accent color instead of sitting in a filled circle).
 */
export const ModalShell: React.FC<{ children: React.ReactNode; onClose: () => void; title: string; icon: React.ReactNode }> = ({
  children,
  onClose,
  title,
  icon,
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const border = css('--twc-border', '#ededed');
  const textPrimary = css('--twc-text-primary', '#161311');
  const headingFont = css('--twf-heading-font', 'inherit');
  const radius = css('--twx-radius', '4px');

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="flex min-h-full items-end justify-center md:items-center md:p-4">
        <div
          className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden"
          style={{ background: css('--twc-background', '#ffffff'), borderRadius: `${radius} ${radius} 0 0`, paddingBottom: 'env(safe-area-inset-bottom)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b p-4 sm:p-5" style={{ borderColor: border }}>
            <div className="flex items-center gap-2.5" style={{ color: textPrimary }}>
              {icon}
              <h2 className="text-base font-medium" style={{ fontFamily: headingFont }}>
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="flex h-9 w-9 items-center justify-center transition hover:opacity-60"
              style={{ color: textPrimary }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModalShell;
