import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Home, SearchX, MapPin, ArrowLeft } from 'lucide-react';

interface StoreNotFoundProps {
    requestedSlug: string;
}

export default function StoreNotFound({ requestedSlug }: StoreNotFoundProps) {
    return (
        <>
            <Head title="Store Not Found" />
            
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 flex items-center justify-center px-4 py-8">
                <div className="max-w-md w-full">
                    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 text-center relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-slate-500/5 rounded-3xl">
                            <div className="absolute top-6 right-6 w-20 h-20 border border-gray-200/30 rounded-full"></div>
                            <div className="absolute bottom-8 left-8 w-12 h-12 border border-gray-200/20 rounded-full"></div>
                        </div>
                        
                        {/* Icon */}
                        <div className="relative mb-6">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-500 to-slate-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <SearchX className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                <MapPin className="w-3 h-3 text-white" />
                            </div>
                        </div>
                        
                        {/* Content */}
                        <div className="relative">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                                Store Not Found
                            </h1>
                            
                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-100 rounded-xl p-4 mb-6">
                                <p className="text-gray-800 font-mono text-sm break-all">
                                    "{requestedSlug}"
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    🔍 Store location not found
                                </p>
                            </div>
                            
                            <p className="text-gray-600 text-sm leading-relaxed mb-8">
                                The store you're looking for might have moved, been renamed, or doesn't exist. Double-check the URL or try searching for it.
                            </p>
                            
                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <Link
                                    href={route('home')}
                                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-700 text-white font-medium rounded-xl hover:from-gray-700 hover:to-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Browse All Stores
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
                        Error 404 • Store location not found
                    </p>
                </div>
            </div>
        </>
    );
}