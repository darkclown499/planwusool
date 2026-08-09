import React from 'react';
import autoParts from './auto-parts';
import b2bWholesale from './b2b-wholesale';
import basic from './basic';
import beauty from './beauty';
import beautyPremium from './beauty-premium';
import books from './books';
import coffeeShop from './coffee-shop';
import digital from './digital';
import electronicsPro from './electronics-pro';
import fashion from './fashion';
import fashionPremium from './fashion-premium';
import flowersGifts from './flowers-gifts';
import food from './food';
import foodPremium from './food-premium';
import furniture from './furniture';
import groceryDelivery from './grocery-delivery';
import handcrafted from './handcrafted';
import homeTools from './home-tools';
import kids from './kids';
import luxuryJewelry from './luxury-jewelry';
import luxuryWatches from './luxury-watches';
import perfumes from './perfumes';
import petStore from './pet-store';
import pharmacy from './pharmacy';
import singleProduct from './single-product';
import sports from './sports';
import stationery from './stationery';
import supermarket from './supermarket';
import tech from './tech';
import type { TemplatePageProps } from './types';

/**
 * Dedicated full-page template implementations.
 * Each template with an entry here renders a hand-crafted, structurally
 * unique page instead of the generic section renderer. Templates without
 * an entry fall back to the JSON section system automatically.
 */
export const TEMPLATE_PAGES: Record<string, React.FC<TemplatePageProps>> = {
    basic,
    'single-product': singleProduct,
    food,
    supermarket,
    fashion,
    tech,
    beauty,
    digital,
    'luxury-jewelry': luxuryJewelry,
    'luxury-watches': luxuryWatches,
    'b2b-wholesale': b2bWholesale,
    furniture,
    'auto-parts': autoParts,
    sports,
    kids,
    handcrafted,
    perfumes,
    'electronics-pro': electronicsPro,
    pharmacy,
    'pet-store': petStore,
    books,
    'flowers-gifts': flowersGifts,
    'grocery-delivery': groceryDelivery,
    'coffee-shop': coffeeShop,
    'home-tools': homeTools,
    stationery,
    'fashion-premium': fashionPremium,
    'beauty-premium': beautyPremium,
    'food-premium': foodPremium,
};

export function hasDedicatedPage(slug?: string): boolean {
    return !!slug && !!TEMPLATE_PAGES[slug];
}
