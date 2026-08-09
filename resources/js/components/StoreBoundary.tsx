import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * Storefront-level error boundary. Prevents a single component error (e.g. one
 * malformed product) from blanking the entire store. Renders a themed fallback
 * that keeps the rest of the page usable.
 */
const StoreBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">حدث خطأ غير متوقع</h1>
          <p className="text-sm text-gray-500 mb-4">حدث خطأ أثناء عرض جزء من المتجر. يرجى تحديث الصفحة.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default StoreBoundary;
