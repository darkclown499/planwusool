import React from 'react';

/** Loading skeleton for the new storefront. */
export const StoreSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="h-16 animate-pulse bg-gray-200" />
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="mx-auto h-10 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="mx-auto mt-4 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    </div>
  </div>
);