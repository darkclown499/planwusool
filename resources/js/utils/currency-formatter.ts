interface CurrencySettings {
  defaultCurrency?: string;
  decimalFormat?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  currencySymbolPosition?: string;
  currencySymbolSpace?: boolean | string;
  floatNumber?: boolean | string;
}

interface Currency {
  code: string;
  symbol: string;
}

interface StoreCurrency {
  code: string;
  symbol: string;
  name: string;
  position: string;
  decimals: number;
  decimal_separator: string;
  thousands_separator: string;
}

/**
 * Format currency using dynamic store currency settings
 */
export function formatStoreCurrency(
  amount: number | string,
  storeCurrency?: StoreCurrency
): string {
  // Get store currency from window.page.props if not provided
  if (!storeCurrency && typeof window !== 'undefined' && (window as any).page?.props?.storeCurrency) {
    storeCurrency = (window as any).page.props.storeCurrency;
  }
  
  // Default fallback
  const currency = storeCurrency || {
    code: 'ILS',
    symbol: '₪',
    name: 'Israeli Shekel',
    position: 'after',
    decimals: 2,
    decimal_separator: '.',
    thousands_separator: ','
  };

  // Convert amount to number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${currency.symbol}0${currency.decimal_separator}${'0'.repeat(currency.decimals)}`;

  // Format with specified decimal places
  const formattedNumber = numAmount.toFixed(currency.decimals);
  
  // Split into integer and decimal parts
  const parts = formattedNumber.split('.');
  
  // Add thousands separator
  if (currency.thousands_separator) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousands_separator);
  }

  // Join with decimal separator
  const finalNumber = parts.join(currency.decimal_separator);

  // Return with currency symbol in correct position (NBSP for RTL)
  return currency.position === 'after' 
    ? `${finalNumber}\u00A0${currency.symbol}`
    : `${currency.symbol}\u00A0${finalNumber}`;
}

interface SecondaryCurrency {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number;
}

/**
 * Resolve the configured secondary currency (code/symbol + manual exchange rate).
 * Reads from the provided storeSettings or from the Inertia page props.
 */
function getSecondaryCurrencyInfo(storeSettings: CurrencySettings, currencies: Currency[]): { symbol: string; exchangeRate: number } | null {
  const propsSecondary: SecondaryCurrency | null =
    typeof window !== 'undefined' && (window as any).page?.props?.secondaryCurrency
      ? (window as any).page.props.secondaryCurrency
      : null;

  const rawStoreSettings = storeSettings as any;
  const code = rawStoreSettings?.secondaryCurrency || propsSecondary?.code || null;
  let exchangeRate = parseFloat(rawStoreSettings?.exchangeRate) || 0;

  if (!exchangeRate && propsSecondary?.exchangeRate) {
    exchangeRate = parseFloat(String(propsSecondary.exchangeRate));
  }
  if (!code || !exchangeRate || exchangeRate <= 0) return null;

  const currency = currencies.find((c) => c.code === code);
  const symbol = propsSecondary?.symbol || currency?.symbol || code;

  return { symbol, exchangeRate };
}

/**
 * Format a plain number with the given decimal/separator settings (no symbol).
 */
function formatNumberValue(
  value: number,
  decimalPlaces: number,
  decimalSeparator: string,
  thousandsSeparator: string
): string {
  const formatted = value.toFixed(decimalPlaces);
  const parts = formatted.split('.');
  if (thousandsSeparator && thousandsSeparator !== 'none') {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  }
  return parts.join(decimalSeparator);
}

/**
 * Format currency based on store settings (legacy function - kept for backward compatibility).
 * When a secondary currency is configured, appends the converted value (e.g. "₪ 100.00 ≈ $ 26.97").
 */
export function formatCurrency(
  amount: number | string, 
  storeSettings: CurrencySettings = {}, 
  currencies: Currency[] = []
): string {
  const {
    defaultCurrency = 'ILS',
    decimalFormat = '2',
    decimalSeparator = '.',
    thousandsSeparator = ',',
    currencySymbolPosition = 'after',
    currencySymbolSpace = false,
    floatNumber = true
  } = storeSettings;

  // Convert amount to number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '₪0.00';

  // Get currency symbol
  const currency = currencies.find(c => c.code === defaultCurrency);
  const symbol = currency?.symbol || '₪';

  // Handle float number setting
  const finalAmount = (floatNumber === false || floatNumber === '0') 
    ? Math.floor(numAmount) 
    : numAmount;

  // Format decimal places
  const decimalPlaces = parseInt(decimalFormat) || 2;

  // Add currency symbol with proper positioning and spacing (NBSP prevents RTL collision)
  const rawSpace = (currencySymbolSpace === true || currencySymbolSpace === '1') ? '\u00A0' : '';
  const effectiveSpace = currencySymbolPosition === 'after' && !rawSpace ? '\u00A0' : rawSpace;
  
  const primary = currencySymbolPosition === 'after' 
    ? `${formatNumberValue(finalAmount, decimalPlaces, decimalSeparator, thousandsSeparator)}${effectiveSpace}${symbol}`
    : `${symbol}${rawSpace}${formatNumberValue(finalAmount, decimalPlaces, decimalSeparator, thousandsSeparator)}`;

  // Dual currency: append the secondary currency value when configured
  const secondary = getSecondaryCurrencyInfo(storeSettings, currencies);
  if (secondary) {
    const secondaryNumber = formatNumberValue(
      numAmount * secondary.exchangeRate,
      decimalPlaces,
      decimalSeparator,
      thousandsSeparator
    );
    const secondaryStr = currencySymbolPosition === 'after'
      ? `${secondaryNumber}${space}${secondary.symbol}`
      : `${secondary.symbol}${space}${secondaryNumber}`;
    return `${primary} ≈ ${secondaryStr}`;
  }

  return primary;
}