import React from 'react';
import { WefaqProductCard } from './WefaqProductCard';

interface WefaqProductSectionProps {
    id: string;
    title: string;
    products: any[];
}

export const WefaqProductSection: React.FC<WefaqProductSectionProps> = ({ id, title, products }) => {
    if (!products.length) return null;

    return (
        <section id={id} className="scroll-mt-32">
            <div className="mb-4 flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full bg-[#4CAF50]" />
                <h2 className="text-xl font-extrabold text-gray-900 md:text-2xl">{title}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((product) => (
                    <WefaqProductCard key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
};

export default WefaqProductSection;
