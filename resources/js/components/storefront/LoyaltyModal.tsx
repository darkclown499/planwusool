import React, { useEffect } from 'react';
import LoyaltyOverview from '@/components/storefront/LoyaltyOverview';

interface LoyaltyModalProps {
  onClose: () => void;
}

export const LoyaltyModal: React.FC<LoyaltyModalProps> = ({ onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative min-h-full flex items-center justify-center p-2 md:p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">نقاط الولاء</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            <LoyaltyOverview />
          </div>
        </div>
      </div>
    </div>
  );
};
