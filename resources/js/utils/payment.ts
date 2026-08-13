export const PAYMENT_METHODS = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  RAZORPAY: 'razorpay',
  MERCADOPAGO: 'mercadopago',
  PAYSTACK: 'paystack',
  FLUTTERWAVE: 'flutterwave',
  BANK: 'bank',
  PAYTABS: 'paytabs',
  SKRILL: 'skrill',
  COINGATE: 'coingate',
  PAYFAST: 'payfast',
  TAP: 'tap',
  XENDIT: 'xendit',
  PAYTR: 'paytr',
  MOLLIE: 'mollie',
  TOYYIBPAY: 'toyyibpay',
  BENEFIT: 'benefit',
  IYZIPAY: 'iyzipay',
  AAMARPAY: 'aamarpay',
  MIDTRANS: 'midtrans',
  YOOKASSA: 'yookassa',
  NEPALSTE: 'nepalste',
  PAIEMENT: 'paiement',
  CINETPAY: 'cinetpay',
  PAYHERE: 'payhere',
  FEDAPAY: 'fedapay',
  AUTHORIZENET: 'authorizenet',
  KHALTI: 'khalti',
  EASEBUZZ: 'easebuzz',
  OZOW: 'ozow',
  CASHFREE: 'cashfree',
  JAWWAL_PAY: 'jawwal_pay',
  PAL_PAY: 'pal_pay',
  ZAIN_CASH: 'zain_cash',
  ORANGE_MONEY: 'orange_money',
  BANK_PALESTINE: 'bank_palestine',
  AL_QUDS_BANK: 'al_quds_bank',
  ARAB_ISLAMIC_BANK: 'arab_islamic_bank',
  CAIRO_AMMAN_BANK: 'cairo_amman_bank',
  HOUSING_BANK: 'housing_bank',
  SAFAD_BANK: 'safad_bank',
  CLIQ: 'cliq',
  ZAIN_CASH_JO: 'zain_cash_jo',
  ORANGE_MONEY_JO: 'orange_money_jo',
  ETIHAD_WALLET: 'etihad_wallet',
  DINAR_PAY: 'dinar_pay',
  JORDAN_KUWAIT_BANK: 'jordan_kuwait_bank',
  ARAB_BANK: 'arab_bank',
  HOUSING_BANK_JO: 'housing_bank_jo',
  CAIRO_AMMAN_BANK_JO: 'cairo_amman_bank_jo',
  SAFAD_BANK_JO: 'safad_bank_jo',
  USDT_TRC20: 'usdt_trc20',
  USDT_ERC20: 'usdt_erc20',
  USDT_BEP20: 'usdt_bep20',
  USDT_POLYGON: 'usdt_polygon',
  USDT_SOLANA: 'usdt_solana'
} as const;

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.STRIPE]: 'Credit Card (Stripe)',
  [PAYMENT_METHODS.PAYPAL]: 'PayPal',
  [PAYMENT_METHODS.RAZORPAY]: 'Razorpay',
  [PAYMENT_METHODS.MERCADOPAGO]: 'Mercado Pago',
  [PAYMENT_METHODS.PAYSTACK]: 'Paystack',
  [PAYMENT_METHODS.FLUTTERWAVE]: 'Flutterwave',
  [PAYMENT_METHODS.BANK]: 'Bank Transfer',
  [PAYMENT_METHODS.PAYTABS]: 'PayTabs',
  [PAYMENT_METHODS.SKRILL]: 'Skrill',
  [PAYMENT_METHODS.COINGATE]: 'CoinGate',
  [PAYMENT_METHODS.PAYFAST]: 'Payfast',
  [PAYMENT_METHODS.TAP]: 'Tap',
  [PAYMENT_METHODS.XENDIT]: 'Xendit',
  [PAYMENT_METHODS.PAYTR]: 'PayTR',
  [PAYMENT_METHODS.MOLLIE]: 'Mollie',
  [PAYMENT_METHODS.TOYYIBPAY]: 'toyyibPay',
  [PAYMENT_METHODS.BENEFIT]: 'Benefit',
  [PAYMENT_METHODS.IYZIPAY]: 'Iyzipay',
  [PAYMENT_METHODS.AAMARPAY]: 'Aamarpay',
  [PAYMENT_METHODS.MIDTRANS]: 'Midtrans',
  [PAYMENT_METHODS.YOOKASSA]: 'YooKassa',
  [PAYMENT_METHODS.NEPALSTE]: 'Nepalste',
  [PAYMENT_METHODS.PAIEMENT]: 'Paiement Pro',
  [PAYMENT_METHODS.CINETPAY]: 'CinetPay',
  [PAYMENT_METHODS.PAYHERE]: 'PayHere',
  [PAYMENT_METHODS.FEDAPAY]: 'FedaPay',
  [PAYMENT_METHODS.AUTHORIZENET]: 'AuthorizeNet',
  [PAYMENT_METHODS.KHALTI]: 'Khalti',
  [PAYMENT_METHODS.EASEBUZZ]: 'Easebuzz',
  [PAYMENT_METHODS.OZOW]: 'Ozow',
  [PAYMENT_METHODS.CASHFREE]: 'Cashfree',
  [PAYMENT_METHODS.JAWWAL_PAY]: 'Jawwal Pay',
  [PAYMENT_METHODS.PAL_PAY]: 'Pal Pay',
  [PAYMENT_METHODS.ZAIN_CASH]: 'Zain Cash',
  [PAYMENT_METHODS.ORANGE_MONEY]: 'Orange Money',
  [PAYMENT_METHODS.BANK_PALESTINE]: 'Bank of Palestine',
  [PAYMENT_METHODS.AL_QUDS_BANK]: 'Al Quds Bank',
  [PAYMENT_METHODS.ARAB_ISLAMIC_BANK]: 'Arab Islamic Bank',
  [PAYMENT_METHODS.CAIRO_AMMAN_BANK]: 'Cairo Amman Bank',
  [PAYMENT_METHODS.HOUSING_BANK]: 'Housing Bank',
  [PAYMENT_METHODS.SAFAD_BANK]: 'Safad Bank',
  [PAYMENT_METHODS.CLIQ]: 'CliQ',
  [PAYMENT_METHODS.ZAIN_CASH_JO]: 'Zain Cash Jordan',
  [PAYMENT_METHODS.ORANGE_MONEY_JO]: 'Orange Money Jordan',
  [PAYMENT_METHODS.ETIHAD_WALLET]: 'Etihad Wallet',
  [PAYMENT_METHODS.DINAR_PAY]: 'Dinar Pay',
  [PAYMENT_METHODS.JORDAN_KUWAIT_BANK]: 'Jordan Kuwait Bank',
  [PAYMENT_METHODS.ARAB_BANK]: 'Arab Bank',
  [PAYMENT_METHODS.HOUSING_BANK_JO]: 'Housing Bank Jordan',
  [PAYMENT_METHODS.CAIRO_AMMAN_BANK_JO]: 'Cairo Amman Bank Jordan',
  [PAYMENT_METHODS.SAFAD_BANK_JO]: 'Safad Bank Jordan',
  [PAYMENT_METHODS.USDT_TRC20]: 'USDT (TRC20)',
  [PAYMENT_METHODS.USDT_ERC20]: 'USDT (ERC20)',
  [PAYMENT_METHODS.USDT_BEP20]: 'USDT (BEP20)',
  [PAYMENT_METHODS.USDT_POLYGON]: 'USDT (Polygon)',
  [PAYMENT_METHODS.USDT_SOLANA]: 'USDT (Solana)'
} as const;

export const PAYMENT_METHOD_HELP_URLS = {
  [PAYMENT_METHODS.STRIPE]: 'https://dashboard.stripe.com/apikeys',
  [PAYMENT_METHODS.PAYPAL]: 'https://developer.paypal.com/home',
  [PAYMENT_METHODS.RAZORPAY]: 'https://dashboard.razorpay.com/',
  [PAYMENT_METHODS.MERCADOPAGO]: 'https://www.mercadopago.com.br/developers/panel/app',
  [PAYMENT_METHODS.PAYSTACK]: 'https://dashboard.paystack.com/#/settings/developers',
  [PAYMENT_METHODS.FLUTTERWAVE]: 'https://dashboard.flutterwave.com/settings/apis',
  [PAYMENT_METHODS.PAYTABS]: 'https://www.paytabs.com/en/support/',
  [PAYMENT_METHODS.SKRILL]: 'https://www.skrill.com/en/business/',
  [PAYMENT_METHODS.COINGATE]: 'https://coingate.com/api/docs',
  [PAYMENT_METHODS.PAYFAST]: 'https://developers.payfast.co.za/',
  [PAYMENT_METHODS.TAP]: 'https://www.tap.company/developers/',
  [PAYMENT_METHODS.XENDIT]: 'https://developers.xendit.co/',
  [PAYMENT_METHODS.PAYTR]: 'https://www.paytr.com/entegrasyon/',
  [PAYMENT_METHODS.MOLLIE]: 'https://docs.mollie.com/',
  [PAYMENT_METHODS.TOYYIBPAY]: 'https://toyyibpay.com/',
  [PAYMENT_METHODS.BENEFIT]: 'https://www.benefit.bh/en/business/merchant-services/',
  [PAYMENT_METHODS.IYZIPAY]: 'https://dev.iyzipay.com/',
  [PAYMENT_METHODS.AAMARPAY]: 'https://aamarpay.com/developer/',
  [PAYMENT_METHODS.MIDTRANS]: 'https://docs.midtrans.com/',
  [PAYMENT_METHODS.YOOKASSA]: 'https://yookassa.ru/developers/',
  [PAYMENT_METHODS.NEPALSTE]: 'https://nepalste.com.np/developer/',
  [PAYMENT_METHODS.PAIEMENT]: 'https://paiementpro.net/documentation/',
  [PAYMENT_METHODS.CINETPAY]: 'https://cinetpay.com/documentation/',
  [PAYMENT_METHODS.PAYHERE]: 'https://www.payhere.lk/developers/',
  [PAYMENT_METHODS.FEDAPAY]: 'https://docs.fedapay.com/',
  [PAYMENT_METHODS.AUTHORIZENET]: 'https://developer.authorize.net/',
  [PAYMENT_METHODS.KHALTI]: 'https://docs.khalti.com/',
  [PAYMENT_METHODS.EASEBUZZ]: 'https://www.easebuzz.in/developer/',
  [PAYMENT_METHODS.OZOW]: 'https://developers.ozow.com/',
  [PAYMENT_METHODS.CASHFREE]: 'https://docs.cashfree.com/',
  [PAYMENT_METHODS.JAWWAL_PAY]: 'https://www.jawwal.ps/ar/jawwalpay',
  [PAYMENT_METHODS.PAL_PAY]: 'https://www.palpay.ps/',
  [PAYMENT_METHODS.ZAIN_CASH]: 'https://www.zaincash.jo/',
  [PAYMENT_METHODS.ORANGE_MONEY]: 'https://www.orange.ps/personal/orange-money',
  [PAYMENT_METHODS.BANK_PALESTINE]: 'https://www.bop.ps/',
  [PAYMENT_METHODS.AL_QUDS_BANK]: 'https://www.alqudsbank.ps/',
  [PAYMENT_METHODS.ARAB_ISLAMIC_BANK]: 'https://www.arabbank.ps/',
  [PAYMENT_METHODS.CAIRO_AMMAN_BANK]: 'https://www.cab.ps/',
  [PAYMENT_METHODS.HOUSING_BANK]: 'https://www.housingbank.ps/',
  [PAYMENT_METHODS.SAFAD_BANK]: 'https://www.safadbank.ps/',
  [PAYMENT_METHODS.CLIQ]: 'https://cliq.jo/',
  [PAYMENT_METHODS.ZAIN_CASH_JO]: 'https://www.zaincash.jo/',
  [PAYMENT_METHODS.ORANGE_MONEY_JO]: 'https://www.orange.jo/personal/orange-money',
  [PAYMENT_METHODS.ETIHAD_WALLET]: 'https://www.etihadwallet.com/',
  [PAYMENT_METHODS.DINAR_PAY]: 'https://dinarpay.com/',
  [PAYMENT_METHODS.JORDAN_KUWAIT_BANK]: 'https://www.jkb.com/',
  [PAYMENT_METHODS.ARAB_BANK]: 'https://www.arabbank.com/',
  [PAYMENT_METHODS.HOUSING_BANK_JO]: 'https://www.housingbank.com/',
  [PAYMENT_METHODS.CAIRO_AMMAN_BANK_JO]: 'https://www.cab.jo/',
  [PAYMENT_METHODS.SAFAD_BANK_JO]: 'https://www.safadbank.com/',
  [PAYMENT_METHODS.USDT_TRC20]: 'https://tronscan.org/',
  [PAYMENT_METHODS.USDT_ERC20]: 'https://etherscan.io/',
  [PAYMENT_METHODS.USDT_BEP20]: 'https://bscscan.com/',
  [PAYMENT_METHODS.USDT_POLYGON]: 'https://polygonscan.com/',
  [PAYMENT_METHODS.USDT_SOLANA]: 'https://solscan.io/'
} as const;

export const PAYMENT_MODES = {
  SANDBOX: 'sandbox',
  LIVE: 'live'
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
export type PaymentMode = typeof PAYMENT_MODES[keyof typeof PAYMENT_MODES];

export interface PaymentConfig {
  enabled: boolean;
  mode?: PaymentMode;
  [key: string]: unknown;
}

export interface PaymentFormData {
  planId: number;
  planPrice: number;
  couponCode?: string;
  billingCycle: 'monthly' | 'yearly';
}

export function formatPaymentAmount(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

export function validatePaymentMethodCredentials(method: PaymentMethod, config: Record<string, unknown>): string[] {
  const errors: string[] = [];

  switch (method) {
    case PAYMENT_METHODS.STRIPE:
      if (!config.key) errors.push('Stripe publishable key is required');
      if (!config.secret) errors.push('Stripe secret key is required');
      break;

    case PAYMENT_METHODS.PAYPAL:
      if (!config.client_id) errors.push('PayPal client ID is required');
      if (!config.secret) errors.push('PayPal secret key is required');
      break;

    case PAYMENT_METHODS.RAZORPAY:
      if (!config.key) errors.push('Razorpay key ID is required');
      if (!config.secret) errors.push('Razorpay secret key is required');
      break;

    case PAYMENT_METHODS.MERCADOPAGO:
      if (!config.access_token) errors.push('MercadoPago access token is required');
      break;

    case PAYMENT_METHODS.PAYSTACK:
      if (!config.public_key) errors.push('Paystack public key is required');
      if (!config.secret_key) errors.push('Paystack secret key is required');
      break;

    case PAYMENT_METHODS.FLUTTERWAVE:
      if (!config.public_key) errors.push('Flutterwave public key is required');
      if (!config.secret_key) errors.push('Flutterwave secret key is required');
      break;

    case PAYMENT_METHODS.BANK:
      if (!config.details) errors.push('Bank details are required');
      break;

    case PAYMENT_METHODS.PAYTABS:
      if (!config.server_key) errors.push('PayTabs server key is required');
      if (!config.client_key) errors.push('PayTabs client key is required');
      break;

    case PAYMENT_METHODS.SKRILL:
      if (!config.merchant_id) errors.push('Skrill merchant ID is required');
      if (!config.secret_word) errors.push('Skrill secret word is required');
      break;

    case PAYMENT_METHODS.COINGATE:
      if (!config.api_token) errors.push('CoinGate API token is required');
      break;

    case PAYMENT_METHODS.PAYFAST:
      if (!config.merchant_id) errors.push('Payfast merchant ID is required');
      if (!config.merchant_key) errors.push('Payfast merchant key is required');
      break;

    case PAYMENT_METHODS.TAP:
      if (!config.secret_key) errors.push('Tap secret key is required');
      break;

    case PAYMENT_METHODS.XENDIT:
      if (!config.secret_key) errors.push('Xendit secret key is required');
      break;

    case PAYMENT_METHODS.PAYTR:
      if (!config.merchant_id) errors.push('PayTR merchant ID is required');
      if (!config.merchant_key) errors.push('PayTR merchant key is required');
      if (!config.merchant_salt) errors.push('PayTR merchant salt is required');
      break;

    case PAYMENT_METHODS.MOLLIE:
      if (!config.api_key) errors.push('Mollie API key is required');
      break;

    case PAYMENT_METHODS.TOYYIBPAY:
      if (!config.category_code) errors.push('toyyibPay category code is required');
      if (!config.secret_key) errors.push('toyyibPay secret key is required');
      break;

    case PAYMENT_METHODS.IYZIPAY:
      if (!config.public_key) errors.push('Iyzipay API key is required');
      if (!config.secret_key) errors.push('Iyzipay secret key is required');
      break;

    case PAYMENT_METHODS.BENEFIT:
      if (!config.public_key) errors.push('Benefit API key is required');
      if (!config.secret_key) errors.push('Benefit secret key is required');
      break;

    case PAYMENT_METHODS.JAWWAL_PAY:
    case PAYMENT_METHODS.PAL_PAY:
    case PAYMENT_METHODS.ZAIN_CASH:
    case PAYMENT_METHODS.ORANGE_MONEY:
    case PAYMENT_METHODS.CLIQ:
    case PAYMENT_METHODS.ZAIN_CASH_JO:
    case PAYMENT_METHODS.ORANGE_MONEY_JO:
    case PAYMENT_METHODS.ETIHAD_WALLET:
    case PAYMENT_METHODS.DINAR_PAY:
      if (config.mode === 'api') {
        if (!config.api_key) errors.push('API Key is required');
        if (!config.secret_key) errors.push('Secret Key is required');
        if (!config.merchant_id) errors.push('Merchant ID is required');
      } else {
        if (!config.phone_number) errors.push('Phone number is required');
        if (!config.merchant_name) errors.push('Merchant name is required');
      }
      break;

    case PAYMENT_METHODS.BANK_PALESTINE:
    case PAYMENT_METHODS.AL_QUDS_BANK:
    case PAYMENT_METHODS.ARAB_ISLAMIC_BANK:
    case PAYMENT_METHODS.CAIRO_AMMAN_BANK:
    case PAYMENT_METHODS.HOUSING_BANK:
    case PAYMENT_METHODS.SAFAD_BANK:
    case PAYMENT_METHODS.JORDAN_KUWAIT_BANK:
    case PAYMENT_METHODS.ARAB_BANK:
    case PAYMENT_METHODS.HOUSING_BANK_JO:
    case PAYMENT_METHODS.CAIRO_AMMAN_BANK_JO:
    case PAYMENT_METHODS.SAFAD_BANK_JO:
      if (config.mode === 'api') {
        if (!config.api_key) errors.push('API Key is required');
        if (!config.secret_key) errors.push('Secret Key is required');
        if (!config.merchant_id) errors.push('Merchant ID is required');
      } else {
        if (!config.phone_number) errors.push('Phone number is required');
        if (!config.merchant_name) errors.push('Merchant name is required');
        if (!config.instructions) errors.push('Payment instructions are required');
      }
      break;

    case PAYMENT_METHODS.USDT_TRC20:
    case PAYMENT_METHODS.USDT_ERC20:
    case PAYMENT_METHODS.USDT_BEP20:
    case PAYMENT_METHODS.USDT_POLYGON:
    case PAYMENT_METHODS.USDT_SOLANA:
      if (config.mode === 'api') {
        if (!config.api_key) errors.push('API Key is required');
        if (!config.secret_key) errors.push('Secret Key is required');
        if (!config.merchant_id) errors.push('Merchant ID is required');
      } else {
        if (!config.wallet_address) errors.push('Wallet address is required');
        if (!config.network) errors.push('Network is required');
      }
      break;
  }

  return errors;
}

export function getPaymentMethodIcon(method: PaymentMethod): string {
  const icons: Record<string, string> = {
    [PAYMENT_METHODS.STRIPE]: 'credit-card',
    [PAYMENT_METHODS.PAYPAL]: 'credit-card',
    [PAYMENT_METHODS.RAZORPAY]: 'indian-rupee',
    [PAYMENT_METHODS.MERCADOPAGO]: 'wallet',
    [PAYMENT_METHODS.PAYSTACK]: 'credit-card',
    [PAYMENT_METHODS.FLUTTERWAVE]: 'credit-card',
    [PAYMENT_METHODS.BANK]: 'banknote',
    [PAYMENT_METHODS.PAYTABS]: 'credit-card',
    [PAYMENT_METHODS.SKRILL]: 'wallet',
    [PAYMENT_METHODS.COINGATE]: 'coins',
    [PAYMENT_METHODS.PAYFAST]: 'credit-card',
    [PAYMENT_METHODS.TAP]: 'credit-card',
    [PAYMENT_METHODS.XENDIT]: 'credit-card',
    [PAYMENT_METHODS.PAYTR]: 'credit-card',
    [PAYMENT_METHODS.MOLLIE]: 'credit-card',
    [PAYMENT_METHODS.TOYYIBPAY]: 'credit-card',
    [PAYMENT_METHODS.IYZIPAY]: 'credit-card',
    [PAYMENT_METHODS.BENEFIT]: 'credit-card',
    [PAYMENT_METHODS.JAWWAL_PAY]: 'smartphone',
    [PAYMENT_METHODS.PAL_PAY]: 'smartphone',
    [PAYMENT_METHODS.ZAIN_CASH]: 'smartphone',
    [PAYMENT_METHODS.ORANGE_MONEY]: 'smartphone',
    [PAYMENT_METHODS.BANK_PALESTINE]: 'banknote',
    [PAYMENT_METHODS.AL_QUDS_BANK]: 'banknote',
    [PAYMENT_METHODS.ARAB_ISLAMIC_BANK]: 'banknote',
    [PAYMENT_METHODS.CAIRO_AMMAN_BANK]: 'banknote',
    [PAYMENT_METHODS.HOUSING_BANK]: 'banknote',
    [PAYMENT_METHODS.SAFAD_BANK]: 'banknote',
    [PAYMENT_METHODS.CLIQ]: 'smartphone',
    [PAYMENT_METHODS.ZAIN_CASH_JO]: 'smartphone',
    [PAYMENT_METHODS.ORANGE_MONEY_JO]: 'smartphone',
    [PAYMENT_METHODS.ETIHAD_WALLET]: 'smartphone',
    [PAYMENT_METHODS.DINAR_PAY]: 'smartphone',
    [PAYMENT_METHODS.JORDAN_KUWAIT_BANK]: 'banknote',
    [PAYMENT_METHODS.ARAB_BANK]: 'banknote',
    [PAYMENT_METHODS.HOUSING_BANK_JO]: 'banknote',
    [PAYMENT_METHODS.CAIRO_AMMAN_BANK_JO]: 'banknote',
    [PAYMENT_METHODS.SAFAD_BANK_JO]: 'banknote',
    [PAYMENT_METHODS.USDT_TRC20]: 'coins',
    [PAYMENT_METHODS.USDT_ERC20]: 'coins',
    [PAYMENT_METHODS.USDT_BEP20]: 'coins',
    [PAYMENT_METHODS.USDT_POLYGON]: 'coins',
    [PAYMENT_METHODS.USDT_SOLANA]: 'coins'
  };

  return icons[method] || 'credit-card';
}