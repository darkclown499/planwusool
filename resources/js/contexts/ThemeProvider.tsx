import { AccountArea } from '@/components/storefront/AccountArea';
import { LanguageSwitcher } from '@/components/storefront/LanguageSwitcher';
import { MobileAppShell } from '@/components/storefront/MobileAppShell';
import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { OrderProvider } from './OrderContext';
import { ProductProvider } from './ProductContext';
import { StoreProvider } from './StoreContext';
import { StorefrontLocaleProvider } from './StorefrontLocaleContext';
import { UIProvider } from './UIContext';
import { WishlistProvider } from './WishlistContext';

interface Product {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    images?: string[];
    sku: string;
    stockQuantity: number;
    categoryId: string;
    category?: string;
    availability: 'in_stock' | 'out_of_stock';
    description?: string;
    variants?: Array<{ name: string; values?: string[]; options?: string[] }>;
    customFields?: { name: string; value: string }[];
    taxName?: string;
    taxPercentage?: number;
}

interface Category {
    id: string;
    name: string;
}

interface StoreConfig {
    storeName: string;
    logo?: string;
    phoneNumber: string;
    currency: string;
    locale?: string;
    secondaryCurrency?: {
        code: string;
        symbol: string;
        name: string;
        exchangeRate: number;
    } | null;
    vat?: {
        vat_number?: string | null;
        tax_registration_number?: string | null;
    };
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    email?: string;
    description?: string;
    copyrightText?: string;
    welcomeMessage?: string;
    socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        youtube?: string;
        whatsapp?: string;
        email?: string;
    };
}

interface Store {
    id: string | number;
    name: string;
    slug: string;
    email?: string;
    logo?: string;
    description?: string;
    theme?: string;
    custom_css?: string;
    custom_javascript?: string;
}

interface Customer {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
}

interface CustomerAddress {
    id: string;
    type: 'billing' | 'shipping';
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    is_default: boolean;
}

interface ThemeProviderProps {
    children: ReactNode;
    config: StoreConfig;
    store: Store;
    categories: Category[];
    products: Product[];
    content?: any;
    isLoggedIn?: boolean;
    customer?: Customer | null;
    customerAddress?: CustomerAddress[];
    showResetModal?: boolean;
    resetToken?: string;
    paymentStatus?: string;
    orderNumber?: string;
    action?: string | null;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    config,
    store,
    categories,
    products,
    content,
    isLoggedIn = false,
    customer = null,
    customerAddress = [],
    showResetModal = false,
    resetToken,
    paymentStatus,
    orderNumber,
    action = null,
}) => {
    return (
        <StorefrontLocaleProvider defaultLocale={config.locale}>
            <StoreProvider config={config} store={store} content={content}>
                <AuthProvider isLoggedIn={isLoggedIn} customer={customer} customerAddress={customerAddress}>
                    <WishlistProvider storeId={store.id} isLoggedIn={isLoggedIn}>
                        <CartProvider storeId={store.id}>
                            <ProductProvider categories={categories} products={products}>
                                <OrderProvider storeId={store.id} isLoggedIn={isLoggedIn} paymentStatus={paymentStatus} orderNumber={orderNumber}>
                                    <UIProvider
                                        showResetModal={showResetModal}
                                        resetToken={resetToken}
                                        paymentStatus={paymentStatus}
                                        orderNumber={orderNumber}
                                        action={action}
                                    >
                                        <MobileAppShell />
                                        {children}
                                        <AccountArea />
                                        <LanguageSwitcher />
                                    </UIProvider>
                                </OrderProvider>
                            </ProductProvider>
                        </CartProvider>
                    </WishlistProvider>
                </AuthProvider>
            </StoreProvider>
        </StorefrontLocaleProvider>
    );
};
