import { usePage } from '@inertiajs/react';

interface CurrencySettings {
    defaultCurrency?: string;
    decimalFormat?: string;
    decimalSeparator?: string;
    thousandsSeparator?: string;
    currencySymbolPosition?: string;
    currencySymbolSpace?: boolean | string;
    floatNumber?: boolean | string;
    currencySymbol?: string;
}

/**
 * Universal currency formatter - works for all pages
 * Uses superadmin settings for superadmin pages, store settings for company pages
 */
export function formatCurrency(amount: number | string): string {
    try {
        const { props } = usePage<any>();
        const user = props.auth?.user;
        
        // Determine which settings to use based on user type
        if (user?.type === 'superadmin' || !user) {
            // Use globalSettings for superadmin and guests (has currencySymbol)
            const settings = props.globalSettings || {};
            
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            if (isNaN(numAmount)) return '₪0.00';
            
            const decimals = parseInt(settings.decimalFormat || '2');
            const decimalSeparator = settings.decimalSeparator || '.';
            const thousandsSeparator = settings.thousandsSeparator || ',';
            const position = settings.currencySymbolPosition || 'before';
            const symbol = settings.currencySymbol || '₪';
            const space = (settings.currencySymbolSpace === true || settings.currencySymbolSpace === '1') ? '\u00A0' : '';
            
            const formattedNumber = numAmount.toFixed(decimals);
            const parts = formattedNumber.split('.');
            
            if (thousandsSeparator !== 'none') {
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
            }
            
            const finalNumber = parts.join(decimalSeparator);
            
            // Always ensure at least NBSP separation when position is after for RTL readability
            const effectiveSpace = position === 'after' && !space ? '\u00A0' : space;
            return position === 'after' 
                ? `${finalNumber}${effectiveSpace}${symbol}`
                : `${symbol}${space}${finalNumber}`;
        } else {
            // Use store-specific currency settings for company users
            const storeCurrency = props.storeCurrency || {};
            
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            if (isNaN(numAmount)) return '₪0.00';
            
            const decimals = storeCurrency.decimals || 2;
            const decimalSeparator = storeCurrency.decimal_separator || '.';
            const thousandsSeparator = storeCurrency.thousands_separator || ',';
            const position = storeCurrency.position || 'after';
            const symbol = storeCurrency.symbol || '₪';
            
            const formattedNumber = numAmount.toFixed(decimals);
            const parts = formattedNumber.split('.');
            
            if (thousandsSeparator !== 'none') {
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
            }
            
            const finalNumber = parts.join(decimalSeparator);
            
            const rawSpace = (storeCurrency.space === true || storeCurrency.space === '1' || storeCurrency.space === 1) ? '\u00A0' : '';
            const effectiveSpace = position === 'after' && !rawSpace ? '\u00A0' : rawSpace;
            
            return position === 'after' 
                ? `${finalNumber}${effectiveSpace}${symbol}`
                : `${symbol}${rawSpace}${finalNumber}`;
        }
            
    } catch (error) {
        return `₪${Number(amount).toFixed(2)}`;
    }
}

/**
 * Format currency using superadmin settings only
 * Use this for plan prices and other superadmin-controlled pricing
 */
export function formatSuperadminCurrency(amount: number | string): string {
    try {
        const { props } = usePage<any>();
        // Always use globalSettings which contains superadmin currency settings
        const settings = props.globalSettings || {};
        

        
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return '₪0.00';
        
        const decimals = parseInt(settings.decimalFormat || '2');
        const decimalSeparator = settings.decimalSeparator || '.';
        const thousandsSeparator = settings.thousandsSeparator || ',';
        const position = settings.currencySymbolPosition || 'after';
        const symbol = settings.currencySymbol || '₪';
        const rawSpace = (settings.currencySymbolSpace === true || settings.currencySymbolSpace === '1') ? '\u00A0' : '';
        const effectiveSpace = position === 'after' && !rawSpace ? '\u00A0' : rawSpace;
        
        const formattedNumber = numAmount.toFixed(decimals);
        const parts = formattedNumber.split('.');
        
        if (thousandsSeparator !== 'none') {
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
        }
        
        const finalNumber = parts.join(decimalSeparator);
        
        return position === 'after' 
            ? `${finalNumber}${effectiveSpace}${symbol}`
            : `${symbol}${rawSpace}${finalNumber}`;
            
    } catch (error) {
        return `₪${Number(amount).toFixed(2)}`;
    }
}

// Legacy support
export const formatAmount = formatCurrency;