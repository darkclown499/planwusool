import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Home, ShieldX, Clock, ArrowLeft } from 'lucide-react';

interface StoreDisabledProps {
    store: {
        name: string;
    };
    reason?: string;
}

export default function StoreDisabled({ store, reason }: StoreDisabledProps) {
    return (
        <>
            <Head title={`Store Unavailable - ${store.name}`} />
            
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
                <div className="max-w-lg w-full">
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 text-center relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl"></div>
                        
                        {/* Icon */}
                        <div className="relative mb-6">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <ShieldX className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                <Clock className="w-3 h-3 text-white" />
                            </div>
                        </div>
                        
                        {/* Content */}
                        <div className="relative">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                                Store Temporarily Closed
                            </h1>
                            
                            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4 mb-6">
                                <p className="text-gray-800 font-medium">
                                    {store.name}
                                </p>
                                <p className="text-sm text-red-600 mt-1">
                                    {reason === 'Plan limit exceeded' ? '⚡ Subscription limit reached' : '🔒 Temporarily disabled'}
                                </p>
                            </div>
                            
                            <p className="text-gray-600 text-sm leading-relaxed mb-8">
                                We're currently unable to serve you at this time. Please check back soon or contact support if you need immediate assistance.
                            </p>
                            
                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <Link
                                    href={route('home')}
                                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Back to Homepage
                                </Link>
                                
                                <button
                                    onClick={() => window.history.back()}
                                    className="w-full inline-flex items-center justify-center px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <p className="text-center text-xs text-gray-500 mt-6">
                        If this issue persists, please contact the store administrator
                    </p>
                </div>
            </div>
        </>
    );
}