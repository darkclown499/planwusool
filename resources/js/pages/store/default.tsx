import React from 'react';
import { Head } from '@inertiajs/react';
import PWAProvider from '@/components/pwa/PWAProvider';
// import { StoreLayout } from '@/layouts/store-layout';

interface Props {
    store: any;
    categories: any[];
    products: any[];
    settings: any;
}

export default function DefaultStore({ store, categories, products, settings }: Props) {
    return (
        <PWAProvider store={store}>
            <Head title={store.name} />
            
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Welcome to {store.name}
                        </h1>
                        <p className="text-lg text-gray-600 mb-8">
                            {store.description}
                        </p>
                        
                        {products && products.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.slice(0, 8).map((product: any) => (
                                    <div key={product.id} className="bg-white rounded-lg shadow-md p-4">
                                        <h3 className="font-semibold text-gray-900 mb-2">
                                            {product.name}
                                        </h3>
                                        <p className="text-gray-600 text-sm mb-3">
                                            {product.description}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-blue-600">
                                                ${product.price}
                                            </span>
                                            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PWAProvider>
    );
}