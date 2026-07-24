import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Home, Wrench, Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';

interface StoreMaintenanceProps {
    store: {
        name: string;
    };
}

export default function StoreMaintenance({ store }: StoreMaintenanceProps) {
    const [dots, setDots] = useState('');
    
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);
    
    return (
        <>
            <Head title={`Under Maintenance - ${store.name}`} />
            
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex items-center justify-center px-4 py-8">
                <div className="max-w-md w-full">
                    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 p-8 text-center relative overflow-hidden">
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-yellow-500/5 rounded-3xl">
                            <div className="absolute top-4 right-4 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                            <div className="absolute bottom-6 left-6 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
                        </div>
                        
                        {/* Icon with Animation */}
                        <div className="relative mb-6">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <Wrench className="w-10 h-10 text-white animate-bounce" style={{animationDuration: '2s'}} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                        </div>
                        
                        {/* Content */}
                        <div className="relative">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                                Under Maintenance{dots}
                            </h1>
                            
                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-100 rounded-xl p-4 mb-6">
                                <p className="text-gray-800 font-medium">
                                    {store.name}
                                </p>
                                <p className="text-sm text-orange-600 mt-1 flex items-center justify-center">
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                    Getting better for you
                                </p>
                            </div>
                            
                            <p className="text-gray-600 text-sm leading-relaxed mb-8">
                                We're making some exciting improvements! Our store will be back online shortly with enhanced features and better performance.
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Almost ready...</p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <Link
                                    href={route('home')}
                                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-medium rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Visit Homepage
                                </Link>
                                
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full inline-flex items-center justify-center px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Check Again
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="text-center mt-6">
                        <p className="text-xs text-gray-500 mb-2">
                            We'll be back shortly
                        </p>
                        <div className="flex items-center justify-center space-x-1">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}