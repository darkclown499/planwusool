import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { Save, CreditCard, AlertCircle, Banknote, IndianRupee, Wallet, Coins, Search, X, Copy, Undo2 } from 'lucide-react';
import { route } from 'ziggy-js';
import { cn } from '@/lib/utils';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_HELP_URLS } from '@/utils/payment';
import { SettingsSection } from '@/components/settings-section';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { useForm, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { useState, useMemo, useEffect, useRef } from 'react';
import { PaymentMethodCard } from '@/components/payment/payment-method-card';
import { PaymentInputField } from '@/components/payment/payment-input-field';
import { PaymentModeSelector } from '@/components/payment/payment-mode-selector';
import { DualModePaymentCard } from '@/components/payment/dual-mode-payment-card';

// Message template types (labeled selector with default templates)
const TEMPLATE_TYPES: { key: string; emoji: string; label: string; template: string }[] = [
  {
    key: 'new_order', emoji: '🛒', label: 'طلب جديد',
    template: "طلب جديد رقم {order_no} من متجر {store_name}\nالعميل: {customer_name}\nالمجموع الكلي: {final_total}\n\nالمنتجات:\n{item_variable}",
  },
  {
    key: 'shipped', emoji: '🚚', label: 'تم الشحن',
    template: "تم شحن طلبك رقم {order_no} من متجر {store_name}\nالعميل: {customer_name}\nالمجموع الكلي: {final_total}",
  },
  {
    key: 'payment_confirmed', emoji: '✅', label: 'تأكيد الدفع',
    template: "تم تأكيد الدفع لطلبك رقم {order_no} بمبلغ {final_total}\nشكراً لثقتكم بمتجر {store_name}",
  },
  {
    key: 'status_update', emoji: '🔔', label: 'تحديث الحالة',
    template: "تم تحديث حالة طلبك رقم {order_no}\nمتجر {store_name}\nالعميل: {customer_name}",
  },
  {
    key: 'abandoned_cart', emoji: '📞', label: 'تذكير بالسلة',
    template: "عزيزنا {customer_name}، تركت بعض الأصناف في سلة التسوق بمتجر {store_name}\n\nالمنتجات:\n{item_variable}\nالمجموع الكلي: {final_total}",
  },
];

// Standard snake_case variable placeholders (used as fallback chips when the
// backend returns no variables, and as the canonical list for the UI).
const DEFAULT_ORDER_VARIABLES = ['order_no', 'customer_name', 'final_total', 'store_name', 'items_list', 'item_variable'];
const DEFAULT_ITEM_VARIABLES = ['product_name', 'variant_name', 'quantity', 'line_total'];

interface PaymentSettings {
  [key: string]: any;
  currency: string;
  currency_symbol: string;
  is_manually_enabled: boolean;
  is_bank_enabled: boolean;
  bank_detail: string;
  is_cod_enabled: boolean;
  is_stripe_enabled: boolean;
  stripe_key: string;
  stripe_secret: string;
  is_paypal_enabled: boolean;
  paypal_mode: 'sandbox' | 'live';
  paypal_client_id: string;
  paypal_secret_key: string;
  is_razorpay_enabled: boolean;
  razorpay_key: string;
  razorpay_secret: string;
  is_mercadopago_enabled: boolean;
  mercadopago_mode: 'sandbox' | 'live';
  mercadopago_access_token: string;
  is_paystack_enabled: boolean;
  paystack_public_key: string;
  paystack_secret_key: string;
  is_flutterwave_enabled: boolean;
  flutterwave_public_key: string;
  flutterwave_secret_key: string;
  is_tap_enabled: boolean;
  tap_secret_key: string;
  is_xendit_enabled: boolean;
  xendit_api_key: string;
  is_paytr_enabled: boolean;
  paytr_merchant_id: string;
  paytr_merchant_key: string;
  paytr_merchant_salt: string;
  is_mollie_enabled: boolean;
  mollie_api_key: string;
  is_toyyibpay_enabled: boolean;
  toyyibpay_category_code: string;
  toyyibpay_secret_key: string;
  toyyibpay_mode: 'sandbox' | 'live';
  is_benefit_enabled: boolean;
  benefit_mode: string;
  benefit_secret_key: string;
  benefit_public_key: string;
  is_iyzipay_enabled: boolean;
  iyzipay_mode: string;
  iyzipay_secret_key: string;
  iyzipay_public_key: string;
  is_aamarpay_enabled: boolean;
  aamarpay_store_id: string;
  aamarpay_signature: string;
  is_midtrans_enabled: boolean;
  midtrans_mode: string;
  midtrans_secret_key: string;
  is_yookassa_enabled: boolean;
  yookassa_shop_id: string;
  yookassa_secret_key: string;
  is_nepalste_enabled: boolean;
  nepalste_mode: string;
  nepalste_secret_key: string;
  nepalste_public_key: string;
  is_paiement_enabled: boolean;
  paiement_merchant_id: string;
  is_cinetpay_enabled: boolean;
  cinetpay_site_id: string;
  cinetpay_api_key: string;
  cinetpay_secret_key: string;
  is_payhere_enabled: boolean;
  payhere_mode: string;
  payhere_merchant_id: string;
  payhere_merchant_secret: string;
  payhere_app_id: string;
  payhere_app_secret: string;
  is_fedapay_enabled: boolean;
  fedapay_mode: string;
  fedapay_secret_key: string;
  fedapay_public_key: string;
  is_authorizenet_enabled: boolean;
  authorizenet_mode: string;
  authorizenet_merchant_id: string;
  authorizenet_transaction_key: string;
  is_khalti_enabled: boolean;
  khalti_secret_key: string;
  khalti_public_key: string;
  is_easebuzz_enabled: boolean;
  easebuzz_merchant_key: string;
  easebuzz_salt_key: string;
  easebuzz_environment: string;
  is_ozow_enabled: boolean;
  ozow_mode: string;
  ozow_site_key: string;
  ozow_private_key: string;
  ozow_api_key: string;
  is_cashfree_enabled: boolean;
  cashfree_mode: string;
  cashfree_secret_key: string;
  cashfree_public_key: string;
  is_telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  is_whatsapp_enabled: boolean;
  whatsapp_number: string;
  messaging_message_template: string;
  messaging_item_template: string;
  is_paytabs_enabled: boolean;
  paytabs_profile_id: string;
  paytabs_server_key: string;
  paytabs_region: string;
  paytabs_currency: string;
  paytabs_mode: 'sandbox' | 'live';
  is_skrill_enabled: boolean;
  skrill_merchant_id: string;
  skrill_secret_word: string;
  is_coingate_enabled: boolean;
  coingate_api_token: string;
  coingate_mode: 'sandbox' | 'live';
  is_payfast_enabled: boolean;
  payfast_merchant_id: string;
  payfast_merchant_key: string;
  payfast_passphrase: string;
  payfast_mode: 'sandbox' | 'live';
}

interface PaymentSettingsProps {
  settings?: any;
  messagingVariables?: {
    orderVariables?: string[];
    itemVariables?: string[];
  };
}

export default function PaymentSettings({ settings = {}, messagingVariables = {} }: PaymentSettingsProps) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [activeCategory, setActiveCategory] = useState('gateways');
  const [activeTemplateType, setActiveTemplateType] = useState('new_order');

  // Dynamic variables from backend
  const orderVariables = messagingVariables?.orderVariables || [];
  const itemVariables = messagingVariables?.itemVariables || [];
  // Always surface a usable set of variable chips even when the backend
  // returns an empty list.
  const effectiveOrderVariables = orderVariables && orderVariables.length > 0 ? orderVariables : DEFAULT_ORDER_VARIABLES;
  const effectiveItemVariables = itemVariables && itemVariables.length > 0 ? itemVariables : DEFAULT_ITEM_VARIABLES;
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const itemRef = useRef<HTMLTextAreaElement>(null);

  const DEFAULT_MSG_TEMPLATE = "طلب جديد رقم {order_no} من متجر {store_name}\nالعميل: {customer_name}\nالمجموع الكلي: {final_total}\n\nالمنتجات:\n{item_variable}";
  const DEFAULT_ITEM_TEMPLATE = "• {product_name} ({variant_name}) × {quantity} = {line_total}";

  const toPlaceholder = (v: string) => v.startsWith('{') ? v : `{${v}}`;

  const insertAtCursor = (ref: React.RefObject<HTMLTextAreaElement | null>, text: string, setter: (val: string) => void) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = ta.value.substring(0, start) + text + ta.value.substring(end);
    setter(newVal.replace(/\n/g, '\\n'));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const restoreDefaults = () => {
    setData('messaging_message_template', DEFAULT_MSG_TEMPLATE.replace(/\n/g, '\\n'));
    setData('messaging_item_template', DEFAULT_ITEM_TEMPLATE.replace(/\n/g, '\\n'));
    toast.success('تم استعادة القالب الافتراضي بنجاح');
  };

  const copyToClipboard = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`تم نسخ ${label} بنجاح`);
    } catch {
      toast.error('فشل النسخ');
    }
  };

  // Form state
  const { data, setData, post, processing, errors, isDirty } = useForm<PaymentSettings>({
    currency: settings.currency || 'USD',
    currency_symbol: settings.currency_symbol || '$',
    is_manually_enabled: settings.is_manually_enabled === true || settings.is_manually_enabled === '1',
    is_bank_enabled: settings.is_bank_enabled === true || settings.is_bank_enabled === '1',
    bank_detail: settings.bank_detail || '',
    is_cod_enabled: settings.is_cod_enabled === true || settings.is_cod_enabled === '1',
    is_stripe_enabled: settings.is_stripe_enabled === true || settings.is_stripe_enabled === '1',
    stripe_key: settings.stripe_key || '',
    stripe_secret: settings.stripe_secret || '',
    is_paypal_enabled: settings.is_paypal_enabled === true || settings.is_paypal_enabled === '1',
    paypal_mode: settings.paypal_mode || 'sandbox',
    paypal_client_id: settings.paypal_client_id || '',
    paypal_secret_key: settings.paypal_secret_key || '',
    is_razorpay_enabled: settings.is_razorpay_enabled === true || settings.is_razorpay_enabled === '1',
    razorpay_key: settings.razorpay_key || '',
    razorpay_secret: settings.razorpay_secret || '',
    is_mercadopago_enabled: settings.is_mercadopago_enabled === true || settings.is_mercadopago_enabled === '1',
    mercadopago_mode: settings.mercadopago_mode || 'sandbox',
    mercadopago_access_token: settings.mercadopago_access_token || '',
    is_paystack_enabled: settings.is_paystack_enabled === true || settings.is_paystack_enabled === '1',
    paystack_public_key: settings.paystack_public_key || '',
    paystack_secret_key: settings.paystack_secret_key || '',
    is_flutterwave_enabled: settings.is_flutterwave_enabled === true || settings.is_flutterwave_enabled === '1',
    flutterwave_public_key: settings.flutterwave_public_key || '',
    flutterwave_secret_key: settings.flutterwave_secret_key || '',
    is_tap_enabled: settings.is_tap_enabled === true || settings.is_tap_enabled === '1',
    tap_secret_key: settings.tap_secret_key || '',
    is_xendit_enabled: settings.is_xendit_enabled === true || settings.is_xendit_enabled === '1',
    xendit_api_key: settings.xendit_api_key || '',
    is_paytr_enabled: settings.is_paytr_enabled === true || settings.is_paytr_enabled === '1',
    paytr_merchant_id: settings.paytr_merchant_id || '',
    paytr_merchant_key: settings.paytr_merchant_key || '',
    paytr_merchant_salt: settings.paytr_merchant_salt || '',
    is_mollie_enabled: settings.is_mollie_enabled === true || settings.is_mollie_enabled === '1',
    mollie_api_key: settings.mollie_api_key || '',
    is_toyyibpay_enabled: settings.is_toyyibpay_enabled === true || settings.is_toyyibpay_enabled === '1',
    toyyibpay_category_code: settings.toyyibpay_category_code || '',
    toyyibpay_secret_key: settings.toyyibpay_secret_key || '',
    toyyibpay_mode: settings.toyyibpay_mode || 'sandbox',
    is_benefit_enabled: settings.is_benefit_enabled === true || settings.is_benefit_enabled === '1',
    benefit_mode: settings.benefit_mode || 'sandbox',
    benefit_secret_key: settings.benefit_secret_key || '',
    benefit_public_key: settings.benefit_public_key || '',
    is_iyzipay_enabled: settings.is_iyzipay_enabled === true || settings.is_iyzipay_enabled === '1',
    iyzipay_mode: settings.iyzipay_mode || 'sandbox',
    iyzipay_secret_key: settings.iyzipay_secret_key || '',
    iyzipay_public_key: settings.iyzipay_public_key || '',
    is_aamarpay_enabled: settings.is_aamarpay_enabled === true || settings.is_aamarpay_enabled === '1',
    aamarpay_store_id: settings.aamarpay_store_id || '',
    aamarpay_signature: settings.aamarpay_signature || '',
    is_midtrans_enabled: settings.is_midtrans_enabled === true || settings.is_midtrans_enabled === '1',
    midtrans_mode: settings.midtrans_mode || 'sandbox',
    midtrans_secret_key: settings.midtrans_secret_key || '',
    is_yookassa_enabled: settings.is_yookassa_enabled === true || settings.is_yookassa_enabled === '1',
    yookassa_shop_id: settings.yookassa_shop_id || '',
    yookassa_secret_key: settings.yookassa_secret_key || '',
    is_nepalste_enabled: settings.is_nepalste_enabled === true || settings.is_nepalste_enabled === '1',
    nepalste_mode: settings.nepalste_mode || 'sandbox',
    nepalste_secret_key: settings.nepalste_secret_key || '',
    nepalste_public_key: settings.nepalste_public_key || '',
    is_paiement_enabled: settings.is_paiement_enabled === true || settings.is_paiement_enabled === '1',
    paiement_merchant_id: settings.paiement_merchant_id || '',
    is_cinetpay_enabled: settings.is_cinetpay_enabled === true || settings.is_cinetpay_enabled === '1',
    cinetpay_site_id: settings.cinetpay_site_id || '',
    cinetpay_api_key: settings.cinetpay_api_key || '',
    cinetpay_secret_key: settings.cinetpay_secret_key || '',
    is_payhere_enabled: settings.is_payhere_enabled === true || settings.is_payhere_enabled === '1',
    payhere_mode: settings.payhere_mode || 'sandbox',
    payhere_merchant_id: settings.payhere_merchant_id || '',
    payhere_merchant_secret: settings.payhere_merchant_secret || '',
    payhere_app_id: settings.payhere_app_id || '',
    payhere_app_secret: settings.payhere_app_secret || '',
    is_fedapay_enabled: settings.is_fedapay_enabled === true || settings.is_fedapay_enabled === '1',
    fedapay_mode: settings.fedapay_mode || 'sandbox',
    fedapay_secret_key: settings.fedapay_secret_key || '',
    fedapay_public_key: settings.fedapay_public_key || '',
    is_authorizenet_enabled: settings.is_authorizenet_enabled === true || settings.is_authorizenet_enabled === '1',
    authorizenet_mode: settings.authorizenet_mode || 'sandbox',
    authorizenet_merchant_id: settings.authorizenet_merchant_id || '',
    authorizenet_transaction_key: settings.authorizenet_transaction_key || '',
    is_khalti_enabled: settings.is_khalti_enabled === true || settings.is_khalti_enabled === '1',
    khalti_secret_key: settings.khalti_secret_key || '',
    khalti_public_key: settings.khalti_public_key || '',
    is_easebuzz_enabled: settings.is_easebuzz_enabled === true || settings.is_easebuzz_enabled === '1',
    easebuzz_merchant_key: settings.easebuzz_merchant_key || '',
    easebuzz_salt_key: settings.easebuzz_salt_key || '',
    easebuzz_environment: settings.easebuzz_environment || '',
    is_ozow_enabled: settings.is_ozow_enabled === true || settings.is_ozow_enabled === '1',
    ozow_mode: settings.ozow_mode || 'sandbox',
    ozow_site_key: settings.ozow_site_key || '',
    ozow_private_key: settings.ozow_private_key || '',
    ozow_api_key: settings.ozow_api_key || '',
    is_cashfree_enabled: settings.is_cashfree_enabled === true || settings.is_cashfree_enabled === '1',
    cashfree_mode: settings.cashfree_mode || 'sandbox',
    cashfree_secret_key: settings.cashfree_secret_key || '',
    cashfree_public_key: settings.cashfree_public_key || '',
    is_telegram_enabled: settings.is_telegram_enabled === true || settings.is_telegram_enabled === '1',
    telegram_bot_token: settings.telegram_bot_token || '',
    telegram_chat_id: settings.telegram_chat_id || '',
    is_whatsapp_enabled: settings.is_whatsapp_enabled === true || settings.is_whatsapp_enabled === '1',
    whatsapp_number: settings.whatsapp_number || '',
    messaging_message_template: settings.messaging_message_template || '',
    messaging_item_template: settings.messaging_item_template || '',
    is_paytabs_enabled: settings.is_paytabs_enabled === true || settings.is_paytabs_enabled === '1',
    paytabs_profile_id: settings.paytabs_profile_id || '',
    paytabs_server_key: settings.paytabs_server_key || '',
    paytabs_region: settings.paytabs_region || 'ARE',
    paytabs_currency: settings.paytabs_currency || '',
    paytabs_mode: settings.paytabs_mode || 'sandbox',
    is_skrill_enabled: settings.is_skrill_enabled === true || settings.is_skrill_enabled === '1',
    skrill_merchant_id: settings.skrill_merchant_id || '',
    skrill_secret_word: settings.skrill_secret_word || '',
    is_coingate_enabled: settings.is_coingate_enabled === true || settings.is_coingate_enabled === '1',
    coingate_api_token: settings.coingate_api_token || '',
    coingate_mode: settings.coingate_mode || 'sandbox',
    is_payfast_enabled: settings.is_payfast_enabled === true || settings.is_payfast_enabled === '1',
    payfast_merchant_id: settings.payfast_merchant_id || '',
    payfast_merchant_key: settings.payfast_merchant_key || '',
    payfast_passphrase: settings.payfast_passphrase || '',
    payfast_mode: settings.payfast_mode || 'sandbox',
    is_jawwal_pay_enabled: settings.is_jawwal_pay_enabled === true || settings.is_jawwal_pay_enabled === '1',
    jawwal_pay_mode: settings.jawwal_pay_mode || 'offline',
    jawwal_pay_phone_number: settings.jawwal_pay_phone_number || '',
    jawwal_pay_merchant_name: settings.jawwal_pay_merchant_name || '',
    jawwal_pay_instructions: settings.jawwal_pay_instructions || '',
    jawwal_pay_api_key: settings.jawwal_pay_api_key || '',
    jawwal_pay_secret_key: settings.jawwal_pay_secret_key || '',
    jawwal_pay_merchant_id: settings.jawwal_pay_merchant_id || '',
    is_pal_pay_enabled: settings.is_pal_pay_enabled === true || settings.is_pal_pay_enabled === '1',
    pal_pay_mode: settings.pal_pay_mode || 'offline',
    pal_pay_phone_number: settings.pal_pay_phone_number || '',
    pal_pay_merchant_name: settings.pal_pay_merchant_name || '',
    pal_pay_instructions: settings.pal_pay_instructions || '',
    pal_pay_api_key: settings.pal_pay_api_key || '',
    pal_pay_secret_key: settings.pal_pay_secret_key || '',
    pal_pay_merchant_id: settings.pal_pay_merchant_id || '',
    is_zain_cash_enabled: settings.is_zain_cash_enabled === true || settings.is_zain_cash_enabled === '1',
    zain_cash_mode: settings.zain_cash_mode || 'offline',
    zain_cash_phone_number: settings.zain_cash_phone_number || '',
    zain_cash_merchant_name: settings.zain_cash_merchant_name || '',
    zain_cash_instructions: settings.zain_cash_instructions || '',
    zain_cash_api_key: settings.zain_cash_api_key || '',
    zain_cash_secret_key: settings.zain_cash_secret_key || '',
    zain_cash_merchant_id: settings.zain_cash_merchant_id || '',
    is_orange_money_enabled: settings.is_orange_money_enabled === true || settings.is_orange_money_enabled === '1',
    orange_money_mode: settings.orange_money_mode || 'offline',
    orange_money_phone_number: settings.orange_money_phone_number || '',
    orange_money_merchant_name: settings.orange_money_merchant_name || '',
    orange_money_instructions: settings.orange_money_instructions || '',
    orange_money_api_key: settings.orange_money_api_key || '',
    orange_money_secret_key: settings.orange_money_secret_key || '',
    orange_money_merchant_id: settings.orange_money_merchant_id || '',
    is_cliq_enabled: settings.is_cliq_enabled === true || settings.is_cliq_enabled === '1',
    cliq_mode: settings.cliq_mode || 'offline',
    cliq_phone_number: settings.cliq_phone_number || '',
    cliq_merchant_name: settings.cliq_merchant_name || '',
    cliq_instructions: settings.cliq_instructions || '',
    cliq_api_key: settings.cliq_api_key || '',
    cliq_secret_key: settings.cliq_secret_key || '',
    cliq_merchant_id: settings.cliq_merchant_id || '',
    is_zain_cash_jo_enabled: settings.is_zain_cash_jo_enabled === true || settings.is_zain_cash_jo_enabled === '1',
    zain_cash_jo_mode: settings.zain_cash_jo_mode || 'offline',
    zain_cash_jo_phone_number: settings.zain_cash_jo_phone_number || '',
    zain_cash_jo_merchant_name: settings.zain_cash_jo_merchant_name || '',
    zain_cash_jo_instructions: settings.zain_cash_jo_instructions || '',
    zain_cash_jo_api_key: settings.zain_cash_jo_api_key || '',
    zain_cash_jo_secret_key: settings.zain_cash_jo_secret_key || '',
    zain_cash_jo_merchant_id: settings.zain_cash_jo_merchant_id || '',
    is_orange_money_jo_enabled: settings.is_orange_money_jo_enabled === true || settings.is_orange_money_jo_enabled === '1',
    orange_money_jo_mode: settings.orange_money_jo_mode || 'offline',
    orange_money_jo_phone_number: settings.orange_money_jo_phone_number || '',
    orange_money_jo_merchant_name: settings.orange_money_jo_merchant_name || '',
    orange_money_jo_instructions: settings.orange_money_jo_instructions || '',
    orange_money_jo_api_key: settings.orange_money_jo_api_key || '',
    orange_money_jo_secret_key: settings.orange_money_jo_secret_key || '',
    orange_money_jo_merchant_id: settings.orange_money_jo_merchant_id || '',
    is_etihad_wallet_enabled: settings.is_etihad_wallet_enabled === true || settings.is_etihad_wallet_enabled === '1',
    etihad_wallet_mode: settings.etihad_wallet_mode || 'offline',
    etihad_wallet_phone_number: settings.etihad_wallet_phone_number || '',
    etihad_wallet_merchant_name: settings.etihad_wallet_merchant_name || '',
    etihad_wallet_instructions: settings.etihad_wallet_instructions || '',
    etihad_wallet_api_key: settings.etihad_wallet_api_key || '',
    etihad_wallet_secret_key: settings.etihad_wallet_secret_key || '',
    etihad_wallet_merchant_id: settings.etihad_wallet_merchant_id || '',
    is_dinar_pay_enabled: settings.is_dinar_pay_enabled === true || settings.is_dinar_pay_enabled === '1',
    dinar_pay_mode: settings.dinar_pay_mode || 'offline',
    dinar_pay_phone_number: settings.dinar_pay_phone_number || '',
    dinar_pay_merchant_name: settings.dinar_pay_merchant_name || '',
    dinar_pay_instructions: settings.dinar_pay_instructions || '',
    dinar_pay_api_key: settings.dinar_pay_api_key || '',
    dinar_pay_secret_key: settings.dinar_pay_secret_key || '',
    dinar_pay_merchant_id: settings.dinar_pay_merchant_id || '',
    is_bank_palestine_enabled: settings.is_bank_palestine_enabled === true || settings.is_bank_palestine_enabled === '1',
    bank_palestine_mode: settings.bank_palestine_mode || 'offline',
    bank_palestine_phone_number: settings.bank_palestine_phone_number || '',
    bank_palestine_merchant_name: settings.bank_palestine_merchant_name || '',
    bank_palestine_instructions: settings.bank_palestine_instructions || '',
    bank_palestine_api_key: settings.bank_palestine_api_key || '',
    bank_palestine_secret_key: settings.bank_palestine_secret_key || '',
    bank_palestine_merchant_id: settings.bank_palestine_merchant_id || '',
    is_al_quds_bank_enabled: settings.is_al_quds_bank_enabled === true || settings.is_al_quds_bank_enabled === '1',
    al_quds_bank_mode: settings.al_quds_bank_mode || 'offline',
    al_quds_bank_phone_number: settings.al_quds_bank_phone_number || '',
    al_quds_bank_merchant_name: settings.al_quds_bank_merchant_name || '',
    al_quds_bank_instructions: settings.al_quds_bank_instructions || '',
    al_quds_bank_api_key: settings.al_quds_bank_api_key || '',
    al_quds_bank_secret_key: settings.al_quds_bank_secret_key || '',
    al_quds_bank_merchant_id: settings.al_quds_bank_merchant_id || '',
    is_arab_islamic_bank_enabled: settings.is_arab_islamic_bank_enabled === true || settings.is_arab_islamic_bank_enabled === '1',
    arab_islamic_bank_mode: settings.arab_islamic_bank_mode || 'offline',
    arab_islamic_bank_phone_number: settings.arab_islamic_bank_phone_number || '',
    arab_islamic_bank_merchant_name: settings.arab_islamic_bank_merchant_name || '',
    arab_islamic_bank_instructions: settings.arab_islamic_bank_instructions || '',
    arab_islamic_bank_api_key: settings.arab_islamic_bank_api_key || '',
    arab_islamic_bank_secret_key: settings.arab_islamic_bank_secret_key || '',
    arab_islamic_bank_merchant_id: settings.arab_islamic_bank_merchant_id || '',
    is_cairo_amman_bank_enabled: settings.is_cairo_amman_bank_enabled === true || settings.is_cairo_amman_bank_enabled === '1',
    cairo_amman_bank_mode: settings.cairo_amman_bank_mode || 'offline',
    cairo_amman_bank_phone_number: settings.cairo_amman_bank_phone_number || '',
    cairo_amman_bank_merchant_name: settings.cairo_amman_bank_merchant_name || '',
    cairo_amman_bank_instructions: settings.cairo_amman_bank_instructions || '',
    cairo_amman_bank_api_key: settings.cairo_amman_bank_api_key || '',
    cairo_amman_bank_secret_key: settings.cairo_amman_bank_secret_key || '',
    cairo_amman_bank_merchant_id: settings.cairo_amman_bank_merchant_id || '',
    is_housing_bank_enabled: settings.is_housing_bank_enabled === true || settings.is_housing_bank_enabled === '1',
    housing_bank_mode: settings.housing_bank_mode || 'offline',
    housing_bank_phone_number: settings.housing_bank_phone_number || '',
    housing_bank_merchant_name: settings.housing_bank_merchant_name || '',
    housing_bank_instructions: settings.housing_bank_instructions || '',
    housing_bank_api_key: settings.housing_bank_api_key || '',
    housing_bank_secret_key: settings.housing_bank_secret_key || '',
    housing_bank_merchant_id: settings.housing_bank_merchant_id || '',
    is_safad_bank_enabled: settings.is_safad_bank_enabled === true || settings.is_safad_bank_enabled === '1',
    safad_bank_mode: settings.safad_bank_mode || 'offline',
    safad_bank_phone_number: settings.safad_bank_phone_number || '',
    safad_bank_merchant_name: settings.safad_bank_merchant_name || '',
    safad_bank_instructions: settings.safad_bank_instructions || '',
    safad_bank_api_key: settings.safad_bank_api_key || '',
    safad_bank_secret_key: settings.safad_bank_secret_key || '',
    safad_bank_merchant_id: settings.safad_bank_merchant_id || '',
    is_jordan_kuwait_bank_enabled: settings.is_jordan_kuwait_bank_enabled === true || settings.is_jordan_kuwait_bank_enabled === '1',
    jordan_kuwait_bank_mode: settings.jordan_kuwait_bank_mode || 'offline',
    jordan_kuwait_bank_phone_number: settings.jordan_kuwait_bank_phone_number || '',
    jordan_kuwait_bank_merchant_name: settings.jordan_kuwait_bank_merchant_name || '',
    jordan_kuwait_bank_instructions: settings.jordan_kuwait_bank_instructions || '',
    jordan_kuwait_bank_api_key: settings.jordan_kuwait_bank_api_key || '',
    jordan_kuwait_bank_secret_key: settings.jordan_kuwait_bank_secret_key || '',
    jordan_kuwait_bank_merchant_id: settings.jordan_kuwait_bank_merchant_id || '',
    is_arab_bank_enabled: settings.is_arab_bank_enabled === true || settings.is_arab_bank_enabled === '1',
    arab_bank_mode: settings.arab_bank_mode || 'offline',
    arab_bank_phone_number: settings.arab_bank_phone_number || '',
    arab_bank_merchant_name: settings.arab_bank_merchant_name || '',
    arab_bank_instructions: settings.arab_bank_instructions || '',
    arab_bank_api_key: settings.arab_bank_api_key || '',
    arab_bank_secret_key: settings.arab_bank_secret_key || '',
    arab_bank_merchant_id: settings.arab_bank_merchant_id || '',
    is_housing_bank_jo_enabled: settings.is_housing_bank_jo_enabled === true || settings.is_housing_bank_jo_enabled === '1',
    housing_bank_jo_mode: settings.housing_bank_jo_mode || 'offline',
    housing_bank_jo_phone_number: settings.housing_bank_jo_phone_number || '',
    housing_bank_jo_merchant_name: settings.housing_bank_jo_merchant_name || '',
    housing_bank_jo_instructions: settings.housing_bank_jo_instructions || '',
    housing_bank_jo_api_key: settings.housing_bank_jo_api_key || '',
    housing_bank_jo_secret_key: settings.housing_bank_jo_secret_key || '',
    housing_bank_jo_merchant_id: settings.housing_bank_jo_merchant_id || '',
    is_cairo_amman_bank_jo_enabled: settings.is_cairo_amman_bank_jo_enabled === true || settings.is_cairo_amman_bank_jo_enabled === '1',
    cairo_amman_bank_jo_mode: settings.cairo_amman_bank_jo_mode || 'offline',
    cairo_amman_bank_jo_phone_number: settings.cairo_amman_bank_jo_phone_number || '',
    cairo_amman_bank_jo_merchant_name: settings.cairo_amman_bank_jo_merchant_name || '',
    cairo_amman_bank_jo_instructions: settings.cairo_amman_bank_jo_instructions || '',
    cairo_amman_bank_jo_api_key: settings.cairo_amman_bank_jo_api_key || '',
    cairo_amman_bank_jo_secret_key: settings.cairo_amman_bank_jo_secret_key || '',
    cairo_amman_bank_jo_merchant_id: settings.cairo_amman_bank_jo_merchant_id || '',
    is_safad_bank_jo_enabled: settings.is_safad_bank_jo_enabled === true || settings.is_safad_bank_jo_enabled === '1',
    safad_bank_jo_mode: settings.safad_bank_jo_mode || 'offline',
    safad_bank_jo_phone_number: settings.safad_bank_jo_phone_number || '',
    safad_bank_jo_merchant_name: settings.safad_bank_jo_merchant_name || '',
    safad_bank_jo_instructions: settings.safad_bank_jo_instructions || '',
    safad_bank_jo_api_key: settings.safad_bank_jo_api_key || '',
    safad_bank_jo_secret_key: settings.safad_bank_jo_secret_key || '',
    safad_bank_jo_merchant_id: settings.safad_bank_jo_merchant_id || '',
    is_usdt_trc20_enabled: settings.is_usdt_trc20_enabled === true || settings.is_usdt_trc20_enabled === '1',
    usdt_trc20_mode: settings.usdt_trc20_mode || 'offline',
    usdt_trc20_wallet_address: settings.usdt_trc20_wallet_address || '',
    usdt_trc20_network: settings.usdt_trc20_network || '',
    usdt_trc20_memo: settings.usdt_trc20_memo || '',
    usdt_trc20_api_key: settings.usdt_trc20_api_key || '',
    usdt_trc20_secret_key: settings.usdt_trc20_secret_key || '',
    usdt_trc20_merchant_id: settings.usdt_trc20_merchant_id || '',
    is_usdt_erc20_enabled: settings.is_usdt_erc20_enabled === true || settings.is_usdt_erc20_enabled === '1',
    usdt_erc20_mode: settings.usdt_erc20_mode || 'offline',
    usdt_erc20_wallet_address: settings.usdt_erc20_wallet_address || '',
    usdt_erc20_network: settings.usdt_erc20_network || '',
    usdt_erc20_memo: settings.usdt_erc20_memo || '',
    usdt_erc20_api_key: settings.usdt_erc20_api_key || '',
    usdt_erc20_secret_key: settings.usdt_erc20_secret_key || '',
    usdt_erc20_merchant_id: settings.usdt_erc20_merchant_id || '',
    is_usdt_bep20_enabled: settings.is_usdt_bep20_enabled === true || settings.is_usdt_bep20_enabled === '1',
    usdt_bep20_mode: settings.usdt_bep20_mode || 'offline',
    usdt_bep20_wallet_address: settings.usdt_bep20_wallet_address || '',
    usdt_bep20_network: settings.usdt_bep20_network || '',
    usdt_bep20_memo: settings.usdt_bep20_memo || '',
    usdt_bep20_api_key: settings.usdt_bep20_api_key || '',
    usdt_bep20_secret_key: settings.usdt_bep20_secret_key || '',
    usdt_bep20_merchant_id: settings.usdt_bep20_merchant_id || '',
    is_usdt_polygon_enabled: settings.is_usdt_polygon_enabled === true || settings.is_usdt_polygon_enabled === '1',
    usdt_polygon_mode: settings.usdt_polygon_mode || 'offline',
    usdt_polygon_wallet_address: settings.usdt_polygon_wallet_address || '',
    usdt_polygon_network: settings.usdt_polygon_network || '',
    usdt_polygon_memo: settings.usdt_polygon_memo || '',
    usdt_polygon_api_key: settings.usdt_polygon_api_key || '',
    usdt_polygon_secret_key: settings.usdt_polygon_secret_key || '',
    usdt_polygon_merchant_id: settings.usdt_polygon_merchant_id || '',
    is_usdt_solana_enabled: settings.is_usdt_solana_enabled === true || settings.is_usdt_solana_enabled === '1',
    usdt_solana_mode: settings.usdt_solana_mode || 'offline',
    usdt_solana_wallet_address: settings.usdt_solana_wallet_address || '',
    usdt_solana_network: settings.usdt_solana_network || '',
    usdt_solana_memo: settings.usdt_solana_memo || '',
    usdt_solana_api_key: settings.usdt_solana_api_key || '',
    usdt_solana_secret_key: settings.usdt_solana_secret_key || '',
    usdt_solana_merchant_id: settings.usdt_solana_merchant_id || '',
  });

  const previewText = useMemo(() => {
    const msgTmpl = (data.messaging_message_template || '').replace(/\\n/g, '\n');
    const itemTmpl = (data.messaging_item_template || DEFAULT_ITEM_TEMPLATE).replace(/\\n/g, '\n');
    const samples = [
      { a: 'قميص', b: 'أبيض - كبير', c: '2', d: '100.00 ر.س' },
      { a: 'بنطلون', b: 'أسود - وسيط', c: '1', d: '50.00 ر.س' },
    ];
    const items = samples.map(s =>
      itemTmpl
        .replace(/\{product_name\}/g, s.a).replace(/\{اسم_المنتج\}/g, s.a)
        .replace(/\{variant_name\}/g, s.b).replace(/\{اسم_المتغير\}/g, s.b)
        .replace(/\{quantity\}/g, s.c).replace(/\{كمية\}/g, s.c)
        .replace(/\{line_total\}/g, s.d).replace(/\{item_total\}/g, s.d).replace(/\{مجموع_السلعة\}/g, s.d)
    ).join('\n');
    return msgTmpl
      .replace(/\{order_no\}/g, '#1082')
      .replace(/\{store_name\}/g, 'متجر الأزياء')
      .replace(/\{customer_name\}/g, 'أحمد محمود')
      .replace(/\{final_total\}/g, '250 ₪')
      .replace(/\{items_list\}/g, items)
      .replace(/\{item_variable\}/g, items);
  }, [data.messaging_message_template, data.messaging_item_template]);

  // Structured bank fields (local state, combined into bank_detail on submit)
  const parseBankDetail = (detail: string) => {
    const result = { bankName: '', accountHolder: '', accountNumber: '', iban: '' };
    if (!detail) return result;
    const lines = detail.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (key === 'اسم البنك' || key === 'Bank') result.bankName = value;
      else if (key === 'اسم صاحب الحساب') result.accountHolder = value;
      else if (key === 'رقم الحساب' || key === 'Account Number') result.accountNumber = value;
      else if (key === 'رقم الآيبان (IBAN)' || key === 'Routing Number' || key === 'IBAN') result.iban = value;
    }
    return result;
  };

  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');

  useEffect(() => {
    const parsed = parseBankDetail(data.bank_detail);
    setBankName(parsed.bankName);
    setAccountHolder(parsed.accountHolder);
    setAccountNumber(parsed.accountNumber);
    setIban(parsed.iban);
  }, []);

  // Payment method categories (tab groups)
  const PAYMENT_CATEGORIES: { key: string; label: string }[] = [
    { key: 'gateways', label: 'بوابات الدفع الإلكتروني' },
    { key: 'wallets', label: 'المحافظ الإلكترونية' },
    { key: 'banks', label: 'التحويلات البنكية' },
    { key: 'crypto', label: 'العملات الرقمية (Crypto)' },
  ];

  const METHOD_CATEGORY: Record<string, string> = {
    // Electronic payment gateways
    cod: 'gateways', stripe: 'gateways', paypal: 'gateways', razorpay: 'gateways',
    mercadopago: 'gateways', paystack: 'gateways', flutterwave: 'gateways',
    // Local wallets
    jawwal_pay: 'wallets', pal_pay: 'wallets', zain_cash: 'wallets', orange_money: 'wallets',
    etihad_wallet: 'wallets', dinar_pay: 'wallets', cliq: 'wallets',
    zain_cash_jo: 'wallets', orange_money_jo: 'wallets',
    // Bank transfers
    bank: 'banks', bank_palestine: 'banks', al_quds_bank: 'banks', arab_islamic_bank: 'banks',
    cairo_amman_bank: 'banks', housing_bank: 'banks', safad_bank: 'banks',
    jordan_kuwait_bank: 'banks', arab_bank: 'banks', housing_bank_jo: 'banks',
    cairo_amman_bank_jo: 'banks', safad_bank_jo: 'banks',
    // Crypto
    usdt_trc20: 'crypto', usdt_erc20: 'crypto', usdt_bep20: 'crypto',
    usdt_polygon: 'crypto', usdt_solana: 'crypto',
  };

  // Payment methods data for search
  const paymentMethods = useMemo(() => {
    const methods: { key: string; name: string }[] = [];

    // Add COD for company users and sub-users
    if (auth?.user?.type === 'company' || (auth?.user?.type !== 'superadmin' && auth?.user?.created_by)) {
      methods.push({ key: 'cod', name: t('Cash on Delivery (COD)') });
    }

    // Bank Transfer
    methods.push({ key: 'bank', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.BANK]) });

    // Stripe
    methods.push({ key: 'stripe', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.STRIPE]) });

    // PayPal
    methods.push({ key: 'paypal', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.PAYPAL]) });

    // Palestinian & Jordanian local methods + USDT
    const localMethods: { key: string; name: string }[] = [
      { key: 'jawwal_pay', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.JAWWAL_PAY]) },
      { key: 'pal_pay', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.PAL_PAY]) },
      { key: 'zain_cash', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ZAIN_CASH]) },
      { key: 'orange_money', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ORANGE_MONEY]) },
      { key: 'bank_palestine', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.BANK_PALESTINE]) },
      { key: 'al_quds_bank', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.AL_QUDS_BANK]) },
      { key: 'arab_islamic_bank', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ARAB_ISLAMIC_BANK]) },
      { key: 'cairo_amman_bank', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CAIRO_AMMAN_BANK]) },
      { key: 'housing_bank', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.HOUSING_BANK]) },
      { key: 'safad_bank', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.SAFAD_BANK]) },
      { key: 'cliq', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CLIQ]) },
      { key: 'zain_cash_jo', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ZAIN_CASH_JO]) },
      { key: 'orange_money_jo', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ORANGE_MONEY_JO]) },
      { key: 'etihad_wallet', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ETIHAD_WALLET]) },
      { key: 'dinar_pay', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.DINAR_PAY]) },
      { key: 'jordan_kuwait_bank', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.JORDAN_KUWAIT_BANK]) },
      { key: 'arab_bank', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ARAB_BANK]) },
      { key: 'housing_bank_jo', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.HOUSING_BANK_JO]) },
      { key: 'cairo_amman_bank_jo', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CAIRO_AMMAN_BANK_JO]) },
      { key: 'safad_bank_jo', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.SAFAD_BANK_JO]) },
      { key: 'usdt_trc20', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_TRC20]) },
      { key: 'usdt_erc20', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_ERC20]) },
      { key: 'usdt_bep20', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_BEP20]) },
      { key: 'usdt_polygon', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_POLYGON]) },
      { key: 'usdt_solana', name: t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_SOLANA]) },
    ];
    methods.push(...localMethods);

    return methods;
  }, [t, auth]);

  // Filter payment methods based on search and status
  const filteredMethods = useMemo(() => {
    let filtered = paymentMethods;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(method =>
        method.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(method => {
        const isEnabled = data[`is_${method.key}_enabled` as keyof PaymentSettings] as boolean;
        return statusFilter === 'enabled' ? isEnabled : !isEnabled;
      });
    }

    return filtered;
  }, [paymentMethods, searchTerm, statusFilter, data]);

  // Check if method should be shown
  const shouldShowMethod = (methodKey: string) => {
    if (METHOD_CATEGORY[methodKey] !== activeCategory) return false;
    return filteredMethods.some(m => m.key === methodKey);
  };

  // Build data object for DualModePaymentCard
  const buildLocalData = (method: string) => ({
    is_enabled: (data[`is_${method}_enabled` as keyof PaymentSettings] as boolean) || false,
    mode: (data[`${method}_mode` as keyof PaymentSettings] as 'offline' | 'api') || 'offline',
    phone_number: (data[`${method}_phone_number` as keyof PaymentSettings] as string) || '',
    merchant_name: (data[`${method}_merchant_name` as keyof PaymentSettings] as string) || '',
    instructions: (data[`${method}_instructions` as keyof PaymentSettings] as string) || '',
    api_key: (data[`${method}_api_key` as keyof PaymentSettings] as string) || '',
    secret_key: (data[`${method}_secret_key` as keyof PaymentSettings] as string) || '',
    merchant_id: (data[`${method}_merchant_id` as keyof PaymentSettings] as string) || '',
    network: (data[`${method}_network` as keyof PaymentSettings] as string) || '',
    wallet_address: (data[`${method}_wallet_address` as keyof PaymentSettings] as string) || '',
    memo: (data[`${method}_memo` as keyof PaymentSettings] as string) || '',
  });

  const setLocalField = (method: string, field: string, value: string) => {
    setData(`${method}_${field}` as Extract<keyof PaymentSettings, string>, value);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const combined = `اسم البنك: ${bankName}\nاسم صاحب الحساب: ${accountHolder}\nرقم الحساب: ${accountNumber}\nرقم الآيبان (IBAN): ${iban}`;
    setData('bank_detail', combined);
    post(route('payment.settings'), {
      onError: (errs: any) => {
        toast.error(t('Failed to update payment settings'));
      }
    });
  };

  return (
    <SettingsSection
      title={t("Payment Settings")}
      description={t("Configure payment gateway for subscription plans")}
    >
      <form id="payment-settings-form" onSubmit={handleSubmit} dir="rtl">
        <div className="space-y-6">
          {/* Payment Methods */}
          <Card dir="rtl">
            <CardHeader dir="rtl">
              <CardTitle className="text-start w-full">{t("Payment Methods")}</CardTitle>
              <CardDescription className="text-start w-full">
                {t("Configure available payment methods for subscription plans")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 rounded-xl bg-muted p-1">
                {PAYMENT_CATEGORIES.map((category) => {
                  const isActive = activeCategory === category.key;
                  const count = paymentMethods.filter(m => METHOD_CATEGORY[m.key] === category.key).length;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setActiveCategory(category.key)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-background hover:text-foreground'
                      )}
                    >
                      {category.label}
                      <span className={`rounded-full px-1.5 text-[10px] ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1" dir="rtl">
                  {/* Fake password field to absorb autofill */}
                  <input type="password" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }} tabIndex={-1} />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    placeholder={t("Search payment methods...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 pl-10 text-start"
                    autoComplete="new-password"
                  />
                  {searchTerm && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute start-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={(value: 'all' | 'enabled' | 'disabled') => setStatusFilter(value)} dir="rtl">
                  <SelectTrigger className="w-[140px] text-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Methods")}</SelectItem>
                    <SelectItem value="enabled">{t("Enabled Only")}</SelectItem>
                    <SelectItem value="disabled">{t("Disabled Only")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters */}
              {(searchTerm || statusFilter !== 'all') && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{t("Active filters:")} </span>
                  {searchTerm && (
                    <Badge variant="secondary" className="text-xs">
                      {t("Search:")} "{searchTerm}"
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="me-1 h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      {t("Status:")} {statusFilter === 'enabled' ? t("Enabled") : t("Disabled")}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="me-1 h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => setStatusFilter('all')}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  )}
                </div>
              )}

              {/* Results Summary & No Results */}
              {(searchTerm || statusFilter !== 'all') && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {filteredMethods.length > 0
                      ? t("Showing {{count}} of {{total}} payment methods", { count: filteredMethods.length, total: paymentMethods.length })
                      : t("No payment methods found matching your criteria")
                    }
                  </span>
                </div>
              )}

              {(searchTerm || statusFilter !== 'all') && filteredMethods.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{t("No results found")}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t("Try adjusting your search or filter criteria")}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                  >
                    {t("Clear filters")}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Cash on Delivery (COD) */}
              {shouldShowMethod('cod') && (
                <PaymentMethodCard
                  title={t('Cash on Delivery (COD)')}
                  methodKey="cod"
                  enabled={data.is_cod_enabled}
                  onToggle={(checked) => setData('is_cod_enabled', checked)}
                >
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t("Enable Cash on Delivery payment method. Customers can pay when they receive their order.")}
                    </p>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t("No additional configuration required. Simply enable this option to allow customers to pay on delivery.")}
                      </AlertDescription>
                    </Alert>
                  </div>
                </PaymentMethodCard>
              )}

              {/* Bank Transfer */}
              {shouldShowMethod('bank') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.BANK])}
                  methodKey="bank"
                  enabled={data.is_bank_enabled}
                  onToggle={(checked) => setData('is_bank_enabled', checked)}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">{t("اسم البنك")}</Label>
                        <Input
                          id="bank_name"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder={t("[اسم البنك الخاص بك]")}
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account_holder">{t("اسم صاحب الحساب")}</Label>
                        <Input
                          id="account_holder"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          placeholder={t("[اسم صاحب الحساب]")}
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account_number">{t("رقم الحساب")}</Label>
                        <Input
                          id="account_number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder={t("[رقم الحساب]")}
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="iban">{t("رقم الآيبان (IBAN)")}</Label>
                        <Input
                          id="iban"
                          value={iban}
                          onChange={(e) => setIban(e.target.value)}
                          placeholder={t("[رقم الآيبان أو السويفت كود]")}
                          dir="rtl"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("ملاحظة: يرجى تحويل قيمة الطلب إلى الحساب البنكي أعلاه وإرفاق إيصال التحويل لتأكيد الطلب يدويًا.")}
                    </p>
                    {errors.bank_detail && (
                      <p className="text-sm text-destructive">{errors.bank_detail}</p>
                    )}
                  </div>
                </PaymentMethodCard>
              )}

              {/* Stripe */}
              {shouldShowMethod('stripe') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.STRIPE])}
                  methodKey="stripe"
                  enabled={data.is_stripe_enabled}
                  onToggle={(checked) => setData('is_stripe_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.STRIPE]}
                  helpText={t("Get your Stripe API keys from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="stripe_key"
                      label={t("Publishable Key")}
                      value={data.stripe_key}
                      onChange={(value) => setData('stripe_key', value)}
                      placeholder="pk_test_..."
                      error={errors.stripe_key}
                    />
                    <PaymentInputField
                      id="stripe_secret"
                      label={t("Secret Key")}
                      value={data.stripe_secret}
                      onChange={(value) => setData('stripe_secret', value)}
                      placeholder="sk_test_..."
                      isSecret
                      error={errors.stripe_secret}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* PayPal */}
              {shouldShowMethod('paypal') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.PAYPAL])}
                  methodKey="paypal"
                  enabled={data.is_paypal_enabled}
                  onToggle={(checked) => setData('is_paypal_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.PAYPAL]}
                  helpText={t("Get your PayPal API credentials from your")}
                >
                  <div className="space-y-4">
                    <PaymentModeSelector
                      value={data.paypal_mode}
                      onChange={(mode) => setData('paypal_mode', mode)}
                      name="paypal"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PaymentInputField
                        id="paypal_client_id"
                        label={t("Client ID")}
                        value={data.paypal_client_id}
                        onChange={(value) => setData('paypal_client_id', value)}
                        placeholder={t("Client ID")}
                        error={errors.paypal_client_id}
                      />
                      <PaymentInputField
                        id="paypal_secret_key"
                        label={t("Secret Key")}
                        value={data.paypal_secret_key}
                        onChange={(value) => setData('paypal_secret_key', value)}
                        placeholder={t("Secret Key")}
                        isSecret
                        error={errors.paypal_secret_key}
                      />
                    </div>
                  </div>
                </PaymentMethodCard>
              )}

              {/* Razorpay */}
              {shouldShowMethod('razorpay') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.RAZORPAY])}
                  icon={<IndianRupee className="h-5 w-5" />}
                  enabled={data.is_razorpay_enabled}
                  onToggle={(checked) => setData('is_razorpay_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.RAZORPAY]}
                  helpText={t("Get your Razorpay API credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="razorpay_key"
                      label={t("Key ID")}
                      value={data.razorpay_key}
                      onChange={(value) => setData('razorpay_key', value)}
                      placeholder="rzp_test_..."
                      error={errors.razorpay_key}
                    />
                    <PaymentInputField
                      id="razorpay_secret"
                      label={t("Secret Key")}
                      value={data.razorpay_secret}
                      onChange={(value) => setData('razorpay_secret', value)}
                      placeholder="..."
                      isSecret
                      error={errors.razorpay_secret}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Mercado Pago */}
              {shouldShowMethod('mercadopago') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.MERCADOPAGO])}
                  icon={<Wallet className="h-5 w-5" />}
                  enabled={data.is_mercadopago_enabled}
                  onToggle={(checked) => setData('is_mercadopago_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.MERCADOPAGO]}
                  helpText={t("Get your Mercado Pago API credentials from your")}
                >
                  <div className="space-y-4">
                    <PaymentModeSelector
                      value={data.mercadopago_mode}
                      onChange={(mode) => setData('mercadopago_mode', mode)}
                      name="mercadopago"
                    />
                    <PaymentInputField
                      id="mercadopago_access_token"
                      label={t("Access Token")}
                      value={data.mercadopago_access_token}
                      onChange={(value) => setData('mercadopago_access_token', value)}
                      placeholder={data.mercadopago_mode === 'sandbox' ? 'TEST-' : 'APP_USR-'}
                      isSecret
                      error={errors.mercadopago_access_token}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("For server-side API integration, use your Private Access Token (NOT your public key). You can find this in your MercadoPago Developer Dashboard under Credentials > Production/Test Credentials > Access token.")}
                    </p>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t("Important: Do not use your Public Key here. The Access Token is different and is required for server-side operations.")}
                      </AlertDescription>
                    </Alert>
                  </div>
                </PaymentMethodCard>
              )}

              {/* Paystack */}
              {shouldShowMethod('paystack') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.PAYSTACK])}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_paystack_enabled}
                  onToggle={(checked) => setData('is_paystack_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.PAYSTACK]}
                  helpText={t("Get your Paystack API credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="paystack_public_key"
                      label={t("Public Key")}
                      value={data.paystack_public_key}
                      onChange={(value) => setData('paystack_public_key', value)}
                      placeholder="pk_test_..."
                      error={errors.paystack_public_key}
                    />
                    <PaymentInputField
                      id="paystack_secret_key"
                      label={t("Secret Key")}
                      value={data.paystack_secret_key}
                      onChange={(value) => setData('paystack_secret_key', value)}
                      placeholder="sk_test_..."
                      isSecret
                      error={errors.paystack_secret_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Flutterwave */}
              {shouldShowMethod('flutterwave') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.FLUTTERWAVE])}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_flutterwave_enabled}
                  onToggle={(checked) => setData('is_flutterwave_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.FLUTTERWAVE]}
                  helpText={t("Get your Flutterwave API credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="flutterwave_public_key"
                      label={t("Public Key")}
                      value={data.flutterwave_public_key}
                      onChange={(value) => setData('flutterwave_public_key', value)}
                      placeholder="FLWPUBK_TEST-..."
                      error={errors.flutterwave_public_key}
                    />
                    <PaymentInputField
                      id="flutterwave_secret_key"
                      label={t("Secret Key")}
                      value={data.flutterwave_secret_key}
                      onChange={(value) => setData('flutterwave_secret_key', value)}
                      placeholder="FLWSECK_TEST-..."
                      isSecret
                      error={errors.flutterwave_secret_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* PayTabs */}
              {shouldShowMethod('paytabs') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.PAYTABS])}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_paytabs_enabled}
                  onToggle={(checked) => setData('is_paytabs_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.PAYTABS]}
                  helpText={t("Get your PayTabs API credentials from your")}
                >
                  <div className="space-y-4">
                    <PaymentModeSelector
                      value={data.paytabs_mode}
                      onChange={(mode) => setData('paytabs_mode', mode)}
                      name="paytabs"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PaymentInputField
                        id="paytabs_profile_id"
                        label={t("Profile ID")}
                        value={data.paytabs_profile_id}
                        onChange={(value) => setData('paytabs_profile_id', value)}
                        placeholder={t("Profile ID")}
                        error={errors.paytabs_profile_id}
                      />
                      <PaymentInputField
                        id="paytabs_server_key"
                        label={t("Server Key")}
                        value={data.paytabs_server_key}
                        onChange={(value) => setData('paytabs_server_key', value)}
                        placeholder={t("Server Key")}
                        isSecret
                        error={errors.paytabs_server_key}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paytabs_region">{t("Region")}</Label>
                      <Select value={data.paytabs_region} onValueChange={(value) => setData('paytabs_region', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select Region")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARE">{t("UAE")}</SelectItem>
                          <SelectItem value="SAU">{t("Saudi Arabia")}</SelectItem>
                          <SelectItem value="OMN">{t("Oman")}</SelectItem>
                          <SelectItem value="JOR">{t("Jordan")}</SelectItem>
                          <SelectItem value="EGY">{t("Egypt")}</SelectItem>
                          <SelectItem value="IRQ">{t("Iraq")}</SelectItem>
                          <SelectItem value="GLOBAL">{t("Global")}</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.paytabs_region && (
                        <p className="text-sm text-destructive">{errors.paytabs_region}</p>
                      )}
                    </div>
                    <PaymentInputField
                      id="paytabs_currency"
                      label={t("Currency Code")}
                      value={data.paytabs_currency}
                      onChange={(value) => setData('paytabs_currency', value.toUpperCase())}
                      placeholder={t("e.g. AED, SAR, USD")}
                      error={errors.paytabs_currency}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Skrill */}
              {shouldShowMethod('skrill') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.SKRILL])}
                  icon={<Wallet className="h-5 w-5" />}
                  enabled={data.is_skrill_enabled}
                  onToggle={(checked) => setData('is_skrill_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.SKRILL]}
                  helpText={t("Get your Skrill merchant credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="skrill_merchant_id"
                      label={t("Merchant ID")}
                      value={data.skrill_merchant_id}
                      onChange={(value) => setData('skrill_merchant_id', value)}
                      placeholder={t("Merchant ID")}
                      error={errors.skrill_merchant_id}
                    />
                    <PaymentInputField
                      id="skrill_secret_word"
                      label={t("Secret Word")}
                      value={data.skrill_secret_word}
                      onChange={(value) => setData('skrill_secret_word', value)}
                      placeholder={t("Secret Word")}
                      isSecret
                      error={errors.skrill_secret_word}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* CoinGate */}
              {shouldShowMethod('coingate') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.COINGATE])}
                  icon={<Coins className="h-5 w-5" />}
                  enabled={data.is_coingate_enabled}
                  onToggle={(checked) => setData('is_coingate_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.COINGATE]}
                  helpText={t("Get your CoinGate API credentials from your")}
                >
                  <div className="space-y-4">
                    <PaymentModeSelector
                      value={data.coingate_mode}
                      onChange={(mode) => setData('coingate_mode', mode)}
                      name="coingate"
                    />
                    <PaymentInputField
                      id="coingate_api_token"
                      label={t("API Token")}
                      value={data.coingate_api_token}
                      onChange={(value) => setData('coingate_api_token', value)}
                      placeholder={t("API Token")}
                      isSecret
                      error={errors.coingate_api_token}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Payfast */}
              {shouldShowMethod('payfast') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.PAYFAST])}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_payfast_enabled}
                  onToggle={(checked) => setData('is_payfast_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.PAYFAST]}
                  helpText={t("Get your Payfast merchant credentials from your")}
                >
                  <div className="space-y-4">
                    <PaymentModeSelector
                      value={data.payfast_mode}
                      onChange={(mode) => setData('payfast_mode', mode)}
                      name="payfast"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PaymentInputField
                        id="payfast_merchant_id"
                        label={t("Merchant ID")}
                        value={data.payfast_merchant_id}
                        onChange={(value) => setData('payfast_merchant_id', value)}
                        placeholder={t("Merchant ID")}
                        error={errors.payfast_merchant_id}
                      />
                      <PaymentInputField
                        id="payfast_merchant_key"
                        label={t("Merchant Key")}
                        value={data.payfast_merchant_key}
                        onChange={(value) => setData('payfast_merchant_key', value)}
                        placeholder={t("Merchant Key")}
                        isSecret
                        error={errors.payfast_merchant_key}
                      />
                    </div>
                    <PaymentInputField
                      id="payfast_passphrase"
                      label={t("Passphrase")}
                      value={data.payfast_passphrase}
                      onChange={(value) => setData('payfast_passphrase', value)}
                      placeholder={t("Passphrase (optional)")}
                      error={errors.payfast_passphrase}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Tap */}
              {shouldShowMethod('tap') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.TAP])}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_tap_enabled}
                  onToggle={(checked) => setData('is_tap_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.TAP]}
                  helpText={t("Get your Tap API credentials from your")}
                >
                  <PaymentInputField
                    id="tap_secret_key"
                    label={t("Secret Key")}
                    value={data.tap_secret_key}
                    onChange={(value) => setData('tap_secret_key', value)}
                    placeholder={t("Secret Key")}
                    isSecret
                    error={errors.tap_secret_key}
                  />
                </PaymentMethodCard>
              )}

              {/* Xendit */}
              {shouldShowMethod('xendit') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.XENDIT])}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_xendit_enabled}
                  onToggle={(checked) => setData('is_xendit_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.XENDIT]}
                  helpText={t("Get your Xendit API credentials from your")}
                >
                  <PaymentInputField
                    id="xendit_api_key"
                    label={t("API Key")}
                    value={data.xendit_api_key}
                    onChange={(value) => setData('xendit_api_key', value)}
                    placeholder={t("API Key")}
                    isSecret
                    error={errors.xendit_api_key}
                  />
                </PaymentMethodCard>
              )}

              {/* PayTR */}
              {shouldShowMethod('paytr') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.PAYTR])}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_paytr_enabled}
                  onToggle={(checked) => setData('is_paytr_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.PAYTR]}
                  helpText={t("Get your PayTR merchant credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="paytr_merchant_id"
                      label={t("Merchant ID")}
                      value={data.paytr_merchant_id}
                      onChange={(value) => setData('paytr_merchant_id', value)}
                      placeholder={t("Merchant ID")}
                      error={errors.paytr_merchant_id}
                    />
                    <PaymentInputField
                      id="paytr_merchant_key"
                      label={t("Merchant Key")}
                      value={data.paytr_merchant_key}
                      onChange={(value) => setData('paytr_merchant_key', value)}
                      placeholder={t("Merchant Key")}
                      isSecret
                      error={errors.paytr_merchant_key}
                    />
                  </div>
                  <PaymentInputField
                    id="paytr_merchant_salt"
                    label={t("Merchant Salt")}
                    value={data.paytr_merchant_salt}
                    onChange={(value) => setData('paytr_merchant_salt', value)}
                    placeholder={t("Merchant Salt")}
                    isSecret
                    error={errors.paytr_merchant_salt}
                  />
                </PaymentMethodCard>
              )}

              {/* Mollie */}
              {shouldShowMethod('mollie') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.MOLLIE])}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_mollie_enabled}
                  onToggle={(checked) => setData('is_mollie_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.MOLLIE]}
                  helpText={t("Get your Mollie API credentials from your")}
                >
                  <PaymentInputField
                    id="mollie_api_key"
                    label={t("API Key")}
                    value={data.mollie_api_key}
                    onChange={(value) => setData('mollie_api_key', value)}
                    placeholder={t("API Key")}
                    isSecret
                    error={errors.mollie_api_key}
                  />
                </PaymentMethodCard>
              )}

              {/* toyyibPay */}
              {shouldShowMethod('toyyibpay') && (
                <PaymentMethodCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.TOYYIBPAY])}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_toyyibpay_enabled}
                  onToggle={(checked) => setData('is_toyyibpay_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.TOYYIBPAY]}
                  helpText={t("Get your toyyibPay credentials from your")}
                >
                  <div className="space-y-4">
                    <PaymentModeSelector
                      value={data.toyyibpay_mode}
                      onChange={(mode) => setData('toyyibpay_mode', mode)}
                      name="toyyibpay"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PaymentInputField
                        id="toyyibpay_category_code"
                        label={t("Category Code")}
                        value={data.toyyibpay_category_code}
                        onChange={(value) => setData('toyyibpay_category_code', value)}
                        placeholder={t("Category Code")}
                        error={errors.toyyibpay_category_code}
                      />
                      <PaymentInputField
                        id="toyyibpay_secret_key"
                        label={t("Secret Key")}
                        value={data.toyyibpay_secret_key}
                        onChange={(value) => setData('toyyibpay_secret_key', value)}
                        placeholder={t("Secret Key")}
                        isSecret
                        error={errors.toyyibpay_secret_key}
                      />
                    </div>
                  </div>
                </PaymentMethodCard>
              )}

              {/* Benefit */}
              {shouldShowMethod('benefit') && (
                <PaymentMethodCard
                  title={t('Benefit')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_benefit_enabled}
                  onToggle={(checked) => setData('is_benefit_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.BENEFIT]}
                  helpText={t("Get your Benefit API credentials from your")}
                >
                  <PaymentModeSelector
                    value={data.benefit_mode as 'sandbox' | 'live'}
                    onChange={(mode) => setData('benefit_mode', mode)}
                    name="benefit"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="benefit_public_key"
                      label={t("Public Key")}
                      value={data.benefit_public_key}
                      onChange={(value) => setData('benefit_public_key', value)}
                      placeholder={t("Public Key")}
                      error={errors.benefit_public_key}
                    />
                    <PaymentInputField
                      id="benefit_secret_key"
                      label={t("Secret Key")}
                      value={data.benefit_secret_key}
                      onChange={(value) => setData('benefit_secret_key', value)}
                      placeholder={t("Secret Key")}
                      isSecret
                      error={errors.benefit_secret_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Iyzipay */}
              {shouldShowMethod('iyzipay') && (
                <PaymentMethodCard
                  title={t('Iyzipay')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_iyzipay_enabled}
                  onToggle={(checked) => setData('is_iyzipay_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.IYZIPAY]}
                  helpText={t("Get your Iyzipay API credentials from your")}
                >
                  <PaymentModeSelector
                    value={data.iyzipay_mode as 'sandbox' | 'live'}
                    onChange={(mode) => setData('iyzipay_mode', mode)}
                    name="iyzipay"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="iyzipay_public_key"
                      label={t("Public Key")}
                      value={data.iyzipay_public_key}
                      onChange={(value) => setData('iyzipay_public_key', value)}
                      placeholder={t("Public Key")}
                      error={errors.iyzipay_public_key}
                    />
                    <PaymentInputField
                      id="iyzipay_secret_key"
                      label={t("Secret Key")}
                      value={data.iyzipay_secret_key}
                      onChange={(value) => setData('iyzipay_secret_key', value)}
                      placeholder={t("Secret Key")}
                      isSecret
                      error={errors.iyzipay_secret_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Aamarpay */}
              {shouldShowMethod('aamarpay') && (
                <PaymentMethodCard
                  title={t('Aamarpay')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_aamarpay_enabled}
                  onToggle={(checked) => setData('is_aamarpay_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.AAMARPAY]}
                  helpText={t("Get your Aamarpay API credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="aamarpay_store_id"
                      label={t("Store ID")}
                      value={data.aamarpay_store_id}
                      onChange={(value) => setData('aamarpay_store_id', value)}
                      placeholder={t("Store ID")}
                      error={errors.aamarpay_store_id}
                    />
                    <PaymentInputField
                      id="aamarpay_signature"
                      label={t("Signature")}
                      value={data.aamarpay_signature}
                      onChange={(value) => setData('aamarpay_signature', value)}
                      placeholder={t("Signature")}
                      isSecret
                      error={errors.aamarpay_signature}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Midtrans */}
              {shouldShowMethod('midtrans') && (
                <PaymentMethodCard
                  title={t('Midtrans')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_midtrans_enabled}
                  onToggle={(checked) => setData('is_midtrans_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.MIDTRANS]}
                  helpText={t("Get your Midtrans API credentials from your")}
                >
                  <PaymentModeSelector
                    value={data.midtrans_mode as 'sandbox' | 'live'}
                    onChange={(mode) => setData('midtrans_mode', mode)}
                    name="midtrans"
                  />
                  <PaymentInputField
                    id="midtrans_secret_key"
                    label={t("Secret Key")}
                    value={data.midtrans_secret_key}
                    onChange={(value) => setData('midtrans_secret_key', value)}
                    placeholder={t("Secret Key")}
                    isSecret
                    error={errors.midtrans_secret_key}
                  />
                </PaymentMethodCard>
              )}

              {/* YooKassa */}
              {shouldShowMethod('yookassa') && (
                <PaymentMethodCard
                  title={t('YooKassa')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_yookassa_enabled}
                  onToggle={(checked) => setData('is_yookassa_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.YOOKASSA]}
                  helpText={t("Get your YooKassa API credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="yookassa_shop_id"
                      label={t("Shop ID")}
                      value={data.yookassa_shop_id}
                      onChange={(value) => setData('yookassa_shop_id', value)}
                      placeholder={t("Shop ID")}
                      error={errors.yookassa_shop_id}
                    />
                    <PaymentInputField
                      id="yookassa_secret_key"
                      label={t("Secret Key")}
                      value={data.yookassa_secret_key}
                      onChange={(value) => setData('yookassa_secret_key', value)}
                      placeholder={t("Secret Key")}
                      isSecret
                      error={errors.yookassa_secret_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Nepalste */}
              {/* {shouldShowMethod('nepalste') && (
              <PaymentMethodCard
                title={t('Nepalste')}
                icon={<CreditCard className="h-5 w-5" />}
                enabled={data.is_nepalste_enabled}
                onToggle={(checked) => setData('is_nepalste_enabled', checked)}
                helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.NEPALSTE]}
                helpText={t("Get your Nepalste API credentials from your")}
              >
                <PaymentModeSelector
                  value={data.nepalste_mode as 'sandbox' | 'live'}
                  onChange={(mode) => setData('nepalste_mode', mode)}
                  name="nepalste"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PaymentInputField
                    id="nepalste_public_key"
                    label={t("Public Key")}
                    value={data.nepalste_public_key}
                    onChange={(value) => setData('nepalste_public_key', value)}
                    placeholder={t("Public Key")}
                    error={errors.nepalste_public_key}
                  />
                  <PaymentInputField
                    id="nepalste_secret_key"
                    label={t("Secret Key")}
                    value={data.nepalste_secret_key}
                    onChange={(value) => setData('nepalste_secret_key', value)}
                    placeholder={t("Secret Key")}
                    isSecret
                    error={errors.nepalste_secret_key}
                  />
                </div>
              </PaymentMethodCard>
              )} */}

              {/* Paiement Pro */}
              {shouldShowMethod('paiement') && (
                <PaymentMethodCard
                  title={t('Paiement Pro')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_paiement_enabled}
                  onToggle={(checked) => setData('is_paiement_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.PAIEMENT]}
                  helpText={t("Get your Paiement Pro API credentials from your")}
                >
                  <PaymentInputField
                    id="paiement_merchant_id"
                    label={t("Merchant ID")}
                    value={data.paiement_merchant_id}
                    onChange={(value) => setData('paiement_merchant_id', value)}
                    placeholder={t("Merchant ID")}
                    error={errors.paiement_merchant_id}
                  />
                </PaymentMethodCard>
              )}

              {/* CinetPay */}
              {shouldShowMethod('cinetpay') && (
                <PaymentMethodCard
                  title={t('CinetPay')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_cinetpay_enabled}
                  onToggle={(checked) => setData('is_cinetpay_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.CINETPAY]}
                  helpText={t("Get your CinetPay API credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PaymentInputField
                      id="cinetpay_site_id"
                      label={t("Site ID")}
                      value={data.cinetpay_site_id}
                      onChange={(value) => setData('cinetpay_site_id', value)}
                      placeholder={t("Site ID")}
                      error={errors.cinetpay_site_id}
                    />
                    <PaymentInputField
                      id="cinetpay_api_key"
                      label={t("API Key")}
                      value={data.cinetpay_api_key}
                      onChange={(value) => setData('cinetpay_api_key', value)}
                      placeholder={t("API Key")}
                      error={errors.cinetpay_api_key}
                    />
                    <PaymentInputField
                      id="cinetpay_secret_key"
                      label={t("Secret Key")}
                      value={data.cinetpay_secret_key}
                      onChange={(value) => setData('cinetpay_secret_key', value)}
                      placeholder={t("Secret Key")}
                      isSecret
                      error={errors.cinetpay_secret_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* PayHere */}
              {shouldShowMethod('payhere') && (
                <PaymentMethodCard
                  title={t('PayHere')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_payhere_enabled}
                  onToggle={(checked) => setData('is_payhere_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.PAYHERE]}
                  helpText={t("Get your PayHere API credentials from your")}
                >
                  <PaymentModeSelector
                    value={data.payhere_mode as 'sandbox' | 'live'}
                    onChange={(mode) => setData('payhere_mode', mode)}
                    name="payhere"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="payhere_merchant_id"
                      label={t("Merchant ID")}
                      value={data.payhere_merchant_id}
                      onChange={(value) => setData('payhere_merchant_id', value)}
                      placeholder={t("Merchant ID")}
                      error={errors.payhere_merchant_id}
                    />
                    <PaymentInputField
                      id="payhere_merchant_secret"
                      label={t("Merchant Secret")}
                      value={data.payhere_merchant_secret}
                      onChange={(value) => setData('payhere_merchant_secret', value)}
                      placeholder={t("Merchant Secret")}
                      isSecret
                      error={errors.payhere_merchant_secret}
                    />
                    <PaymentInputField
                      id="payhere_app_id"
                      label={t("App ID")}
                      value={data.payhere_app_id}
                      onChange={(value) => setData('payhere_app_id', value)}
                      placeholder={t("App ID")}
                      error={errors.payhere_app_id}
                    />
                    <PaymentInputField
                      id="payhere_app_secret"
                      label={t("App Secret")}
                      value={data.payhere_app_secret}
                      onChange={(value) => setData('payhere_app_secret', value)}
                      placeholder={t("App Secret")}
                      isSecret
                      error={errors.payhere_app_secret}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* FedaPay */}
              {shouldShowMethod('fedapay') && (
                <PaymentMethodCard
                  title={t('FedaPay')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_fedapay_enabled}
                  onToggle={(checked) => setData('is_fedapay_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.FEDAPAY]}
                  helpText={t("Get your FedaPay API credentials from your")}
                >
                  <PaymentModeSelector
                    value={data.fedapay_mode as 'sandbox' | 'live'}
                    onChange={(mode) => setData('fedapay_mode', mode)}
                    name="fedapay"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="fedapay_public_key"
                      label={t("Public Key")}
                      value={data.fedapay_public_key}
                      onChange={(value) => setData('fedapay_public_key', value)}
                      placeholder={t("Public Key")}
                      error={errors.fedapay_public_key}
                    />
                    <PaymentInputField
                      id="fedapay_secret_key"
                      label={t("Secret Key")}
                      value={data.fedapay_secret_key}
                      onChange={(value) => setData('fedapay_secret_key', value)}
                      placeholder={t("Secret Key")}
                      isSecret
                      error={errors.fedapay_secret_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* AuthorizeNet */}
              {shouldShowMethod('authorizenet') && (
                <PaymentMethodCard
                  title={t('AuthorizeNet')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_authorizenet_enabled}
                  onToggle={(checked) => setData('is_authorizenet_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.AUTHORIZENET]}
                  helpText={t("Get your AuthorizeNet API credentials from your")}
                >
                  <PaymentModeSelector
                    value={data.authorizenet_mode as 'sandbox' | 'live'}
                    onChange={(mode) => setData('authorizenet_mode', mode)}
                    name="authorizenet"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="authorizenet_merchant_id"
                      label={t("Merchant ID")}
                      value={data.authorizenet_merchant_id}
                      onChange={(value) => setData('authorizenet_merchant_id', value)}
                      placeholder={t("Merchant ID")}
                      error={errors.authorizenet_merchant_id}
                    />
                    <PaymentInputField
                      id="authorizenet_transaction_key"
                      label={t("Transaction Key")}
                      value={data.authorizenet_transaction_key}
                      onChange={(value) => setData('authorizenet_transaction_key', value)}
                      placeholder={t("Transaction Key")}
                      isSecret
                      error={errors.authorizenet_transaction_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Khalti */}
              {shouldShowMethod('khalti') && (
                <PaymentMethodCard
                  title={t('Khalti')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_khalti_enabled}
                  onToggle={(checked) => setData('is_khalti_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.KHALTI]}
                  helpText={t("Get your Khalti API credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="khalti_public_key"
                      label={t("Public Key")}
                      value={data.khalti_public_key}
                      onChange={(value) => setData('khalti_public_key', value)}
                      placeholder={t("Public Key")}
                      error={errors.khalti_public_key}
                    />
                    <PaymentInputField
                      id="khalti_secret_key"
                      label={t("Secret Key")}
                      value={data.khalti_secret_key}
                      onChange={(value) => setData('khalti_secret_key', value)}
                      placeholder={t("Secret Key")}
                      isSecret
                      error={errors.khalti_secret_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Easebuzz */}
              {shouldShowMethod('easebuzz') && (
                <PaymentMethodCard
                  title={t('Easebuzz')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_easebuzz_enabled}
                  onToggle={(checked) => setData('is_easebuzz_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.EASEBUZZ]}
                  helpText={t("Get your Easebuzz API credentials from your")}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PaymentInputField
                      id="easebuzz_merchant_key"
                      label={t("Merchant Key")}
                      value={data.easebuzz_merchant_key}
                      onChange={(value) => setData('easebuzz_merchant_key', value)}
                      placeholder={t("Merchant Key")}
                      error={errors.easebuzz_merchant_key}
                    />
                    <PaymentInputField
                      id="easebuzz_salt_key"
                      label={t("Salt Key")}
                      value={data.easebuzz_salt_key}
                      onChange={(value) => setData('easebuzz_salt_key', value)}
                      placeholder={t("Salt Key")}
                      isSecret
                      error={errors.easebuzz_salt_key}
                    />
                    <PaymentInputField
                      id="easebuzz_environment"
                      label={t("Environment")}
                      value={data.easebuzz_environment}
                      onChange={(value) => setData('easebuzz_environment', value)}
                      placeholder={t("prod/test")}
                      error={errors.easebuzz_environment}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Ozow */}
              {shouldShowMethod('ozow') && (
                <PaymentMethodCard
                  title={t('Ozow')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_ozow_enabled}
                  onToggle={(checked) => setData('is_ozow_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.OZOW]}
                  helpText={t("Get your Ozow API credentials from your")}
                >
                  <PaymentModeSelector
                    value={data.ozow_mode as 'sandbox' | 'live'}
                    onChange={(mode) => setData('ozow_mode', mode)}
                    name="ozow"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PaymentInputField
                      id="ozow_site_key"
                      label={t("Site Key")}
                      value={data.ozow_site_key}
                      onChange={(value) => setData('ozow_site_key', value)}
                      placeholder={t("Site Key")}
                      error={errors.ozow_site_key}
                    />
                    <PaymentInputField
                      id="ozow_private_key"
                      label={t("Private Key")}
                      value={data.ozow_private_key}
                      onChange={(value) => setData('ozow_private_key', value)}
                      placeholder={t("Private Key")}
                      isSecret
                      error={errors.ozow_private_key}
                    />
                    <PaymentInputField
                      id="ozow_api_key"
                      label={t("API Key")}
                      value={data.ozow_api_key}
                      onChange={(value) => setData('ozow_api_key', value)}
                      placeholder={t("API Key")}
                      error={errors.ozow_api_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Cashfree */}
              {shouldShowMethod('cashfree') && (
                <PaymentMethodCard
                  title={t('Cashfree')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_cashfree_enabled}
                  onToggle={(checked) => setData('is_cashfree_enabled', checked)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.CASHFREE]}
                  helpText={t("Get your Cashfree API credentials from your")}
                >
                  <PaymentModeSelector
                    value={data.cashfree_mode as 'sandbox' | 'live'}
                    onChange={(mode) => setData('cashfree_mode', mode)}
                    name="cashfree"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentInputField
                      id="cashfree_public_key"
                      label={t("Public Key")}
                      value={data.cashfree_public_key}
                      onChange={(value) => setData('cashfree_public_key', value)}
                      placeholder={t("Public Key")}
                      error={errors.cashfree_public_key}
                    />
                    <PaymentInputField
                      id="cashfree_secret_key"
                      label={t("Secret Key")}
                      value={data.cashfree_secret_key}
                      onChange={(value) => setData('cashfree_secret_key', value)}
                      placeholder={t("Secret Key")}
                      isSecret
                      error={errors.cashfree_secret_key}
                    />
                  </div>
                </PaymentMethodCard>
              )}

              {/* Palestinian & Jordanian Local Payment Methods */}
              {shouldShowMethod('jawwal_pay') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.JAWWAL_PAY])}
                  methodKey="jawwal_pay"
                  kind="local"
                  data={buildLocalData('jawwal_pay')}
                  onToggle={(checked) => setData('is_jawwal_pay_enabled', checked)}
                  onModeChange={(mode) => setData('jawwal_pay_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('jawwal_pay', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.JAWWAL_PAY]}
                  helpText={t("Get your Jawwal Pay credentials from your")}
                />
              )}

              {shouldShowMethod('pal_pay') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.PAL_PAY])}
                  methodKey="pal_pay"
                  kind="local"
                  data={buildLocalData('pal_pay')}
                  onToggle={(checked) => setData('is_pal_pay_enabled', checked)}
                  onModeChange={(mode) => setData('pal_pay_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('pal_pay', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.PAL_PAY]}
                  helpText={t("Get your PalPay credentials from your")}
                />
              )}

              {shouldShowMethod('zain_cash') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ZAIN_CASH])}
                  methodKey="zain_cash"
                  kind="local"
                  data={buildLocalData('zain_cash')}
                  onToggle={(checked) => setData('is_zain_cash_enabled', checked)}
                  onModeChange={(mode) => setData('zain_cash_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('zain_cash', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.ZAIN_CASH]}
                  helpText={t("Get your Zain Cash credentials from your")}
                />
              )}

              {shouldShowMethod('orange_money') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ORANGE_MONEY])}
                  methodKey="orange_money"
                  kind="local"
                  data={buildLocalData('orange_money')}
                  onToggle={(checked) => setData('is_orange_money_enabled', checked)}
                  onModeChange={(mode) => setData('orange_money_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('orange_money', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.ORANGE_MONEY]}
                  helpText={t("Get your Orange Money credentials from your")}
                />
              )}

              {shouldShowMethod('bank_palestine') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.BANK_PALESTINE])}
                  methodKey="bank_palestine"
                  kind="local"
                  data={buildLocalData('bank_palestine')}
                  onToggle={(checked) => setData('is_bank_palestine_enabled', checked)}
                  onModeChange={(mode) => setData('bank_palestine_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('bank_palestine', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.BANK_PALESTINE]}
                  helpText={t("Get your Bank of Palestine credentials from your")}
                />
              )}

              {shouldShowMethod('al_quds_bank') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.AL_QUDS_BANK])}
                  methodKey="al_quds_bank"
                  kind="local"
                  data={buildLocalData('al_quds_bank')}
                  onToggle={(checked) => setData('is_al_quds_bank_enabled', checked)}
                  onModeChange={(mode) => setData('al_quds_bank_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('al_quds_bank', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.AL_QUDS_BANK]}
                  helpText={t("Get your Al Quds Bank credentials from your")}
                />
              )}

              {shouldShowMethod('arab_islamic_bank') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ARAB_ISLAMIC_BANK])}
                  methodKey="arab_islamic_bank"
                  kind="local"
                  data={buildLocalData('arab_islamic_bank')}
                  onToggle={(checked) => setData('is_arab_islamic_bank_enabled', checked)}
                  onModeChange={(mode) => setData('arab_islamic_bank_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('arab_islamic_bank', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.ARAB_ISLAMIC_BANK]}
                  helpText={t("Get your Arab Islamic Bank credentials from your")}
                />
              )}

              {shouldShowMethod('cairo_amman_bank') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CAIRO_AMMAN_BANK])}
                  methodKey="cairo_amman_bank"
                  kind="local"
                  data={buildLocalData('cairo_amman_bank')}
                  onToggle={(checked) => setData('is_cairo_amman_bank_enabled', checked)}
                  onModeChange={(mode) => setData('cairo_amman_bank_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('cairo_amman_bank', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.CAIRO_AMMAN_BANK]}
                  helpText={t("Get your Cairo Amman Bank credentials from your")}
                />
              )}

              {shouldShowMethod('housing_bank') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.HOUSING_BANK])}
                  methodKey="housing_bank"
                  kind="local"
                  data={buildLocalData('housing_bank')}
                  onToggle={(checked) => setData('is_housing_bank_enabled', checked)}
                  onModeChange={(mode) => setData('housing_bank_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('housing_bank', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.HOUSING_BANK]}
                  helpText={t("Get your Housing Bank credentials from your")}
                />
              )}

              {shouldShowMethod('safad_bank') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.SAFAD_BANK])}
                  methodKey="safad_bank"
                  kind="local"
                  data={buildLocalData('safad_bank')}
                  onToggle={(checked) => setData('is_safad_bank_enabled', checked)}
                  onModeChange={(mode) => setData('safad_bank_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('safad_bank', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.SAFAD_BANK]}
                  helpText={t("Get your Safad Bank credentials from your")}
                />
              )}

              {shouldShowMethod('cliq') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CLIQ])}
                  methodKey="cliq"
                  kind="local"
                  data={buildLocalData('cliq')}
                  onToggle={(checked) => setData('is_cliq_enabled', checked)}
                  onModeChange={(mode) => setData('cliq_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('cliq', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.CLIQ]}
                  helpText={t("Get your CLIQ credentials from your")}
                />
              )}

              {shouldShowMethod('zain_cash_jo') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ZAIN_CASH_JO])}
                  methodKey="zain_cash_jo"
                  kind="local"
                  data={buildLocalData('zain_cash_jo')}
                  onToggle={(checked) => setData('is_zain_cash_jo_enabled', checked)}
                  onModeChange={(mode) => setData('zain_cash_jo_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('zain_cash_jo', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.ZAIN_CASH_JO]}
                  helpText={t("Get your Zain Cash credentials from your")}
                />
              )}

              {shouldShowMethod('orange_money_jo') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ORANGE_MONEY_JO])}
                  methodKey="orange_money_jo"
                  kind="local"
                  data={buildLocalData('orange_money_jo')}
                  onToggle={(checked) => setData('is_orange_money_jo_enabled', checked)}
                  onModeChange={(mode) => setData('orange_money_jo_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('orange_money_jo', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.ORANGE_MONEY_JO]}
                  helpText={t("Get your Orange Money credentials from your")}
                />
              )}

              {shouldShowMethod('etihad_wallet') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ETIHAD_WALLET])}
                  methodKey="etihad_wallet"
                  kind="local"
                  data={buildLocalData('etihad_wallet')}
                  onToggle={(checked) => setData('is_etihad_wallet_enabled', checked)}
                  onModeChange={(mode) => setData('etihad_wallet_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('etihad_wallet', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.ETIHAD_WALLET]}
                  helpText={t("Get your Etihad Wallet credentials from your")}
                />
              )}

              {shouldShowMethod('dinar_pay') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.DINAR_PAY])}
                  methodKey="dinar_pay"
                  kind="local"
                  data={buildLocalData('dinar_pay')}
                  onToggle={(checked) => setData('is_dinar_pay_enabled', checked)}
                  onModeChange={(mode) => setData('dinar_pay_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('dinar_pay', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.DINAR_PAY]}
                  helpText={t("Get your DinarPay credentials from your")}
                />
              )}

              {shouldShowMethod('jordan_kuwait_bank') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.JORDAN_KUWAIT_BANK])}
                  methodKey="jordan_kuwait_bank"
                  kind="local"
                  data={buildLocalData('jordan_kuwait_bank')}
                  onToggle={(checked) => setData('is_jordan_kuwait_bank_enabled', checked)}
                  onModeChange={(mode) => setData('jordan_kuwait_bank_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('jordan_kuwait_bank', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.JORDAN_KUWAIT_BANK]}
                  helpText={t("Get your Jordan Kuwait Bank credentials from your")}
                />
              )}

              {shouldShowMethod('arab_bank') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.ARAB_BANK])}
                  methodKey="arab_bank"
                  kind="local"
                  data={buildLocalData('arab_bank')}
                  onToggle={(checked) => setData('is_arab_bank_enabled', checked)}
                  onModeChange={(mode) => setData('arab_bank_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('arab_bank', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.ARAB_BANK]}
                  helpText={t("Get your Arab Bank credentials from your")}
                />
              )}

              {shouldShowMethod('housing_bank_jo') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.HOUSING_BANK_JO])}
                  methodKey="housing_bank_jo"
                  kind="local"
                  data={buildLocalData('housing_bank_jo')}
                  onToggle={(checked) => setData('is_housing_bank_jo_enabled', checked)}
                  onModeChange={(mode) => setData('housing_bank_jo_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('housing_bank_jo', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.HOUSING_BANK_JO]}
                  helpText={t("Get your Housing Bank credentials from your")}
                />
              )}

              {shouldShowMethod('cairo_amman_bank_jo') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.CAIRO_AMMAN_BANK_JO])}
                  methodKey="cairo_amman_bank_jo"
                  kind="local"
                  data={buildLocalData('cairo_amman_bank_jo')}
                  onToggle={(checked) => setData('is_cairo_amman_bank_jo_enabled', checked)}
                  onModeChange={(mode) => setData('cairo_amman_bank_jo_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('cairo_amman_bank_jo', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.CAIRO_AMMAN_BANK_JO]}
                  helpText={t("Get your Cairo Amman Bank credentials from your")}
                />
              )}

              {shouldShowMethod('safad_bank_jo') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.SAFAD_BANK_JO])}
                  methodKey="safad_bank_jo"
                  kind="local"
                  data={buildLocalData('safad_bank_jo')}
                  onToggle={(checked) => setData('is_safad_bank_jo_enabled', checked)}
                  onModeChange={(mode) => setData('safad_bank_jo_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('safad_bank_jo', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.SAFAD_BANK_JO]}
                  helpText={t("Get your Safad Bank credentials from your")}
                />
              )}

              {/* USDT Crypto Payment Methods */}
              {shouldShowMethod('usdt_trc20') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_TRC20])}
                  methodKey="usdt_trc20"
                  kind="usdt"
                  data={buildLocalData('usdt_trc20')}
                  onToggle={(checked) => setData('is_usdt_trc20_enabled', checked)}
                  onModeChange={(mode) => setData('usdt_trc20_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('usdt_trc20', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.USDT_TRC20]}
                  helpText={t("Configure your USDT wallet for TRC20 network")}
                />
              )}

              {shouldShowMethod('usdt_erc20') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_ERC20])}
                  methodKey="usdt_erc20"
                  kind="usdt"
                  data={buildLocalData('usdt_erc20')}
                  onToggle={(checked) => setData('is_usdt_erc20_enabled', checked)}
                  onModeChange={(mode) => setData('usdt_erc20_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('usdt_erc20', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.USDT_ERC20]}
                  helpText={t("Configure your USDT wallet for ERC20 network")}
                />
              )}

              {shouldShowMethod('usdt_bep20') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_BEP20])}
                  methodKey="usdt_bep20"
                  kind="usdt"
                  data={buildLocalData('usdt_bep20')}
                  onToggle={(checked) => setData('is_usdt_bep20_enabled', checked)}
                  onModeChange={(mode) => setData('usdt_bep20_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('usdt_bep20', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.USDT_BEP20]}
                  helpText={t("Configure your USDT wallet for BEP20 network")}
                />
              )}

              {shouldShowMethod('usdt_polygon') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_POLYGON])}
                  methodKey="usdt_polygon"
                  kind="usdt"
                  data={buildLocalData('usdt_polygon')}
                  onToggle={(checked) => setData('is_usdt_polygon_enabled', checked)}
                  onModeChange={(mode) => setData('usdt_polygon_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('usdt_polygon', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.USDT_POLYGON]}
                  helpText={t("Configure your USDT wallet for Polygon network")}
                />
              )}

              {shouldShowMethod('usdt_solana') && (
                <DualModePaymentCard
                  title={t(PAYMENT_METHOD_LABELS[PAYMENT_METHODS.USDT_SOLANA])}
                  methodKey="usdt_solana"
                  kind="usdt"
                  data={buildLocalData('usdt_solana')}
                  onToggle={(checked) => setData('is_usdt_solana_enabled', checked)}
                  onModeChange={(mode) => setData('usdt_solana_mode', mode)}
                  onFieldChange={(field, value) => setLocalField('usdt_solana', field, value)}
                  helpUrl={PAYMENT_METHOD_HELP_URLS[PAYMENT_METHODS.USDT_SOLANA]}
                  helpText={t("Configure your USDT wallet for Solana network")}
                />
              )}

              {/* WhatsApp - For company users and sub-users */}
              {shouldShowMethod('whatsapp') && (auth?.user?.type === 'company' || (auth?.user?.type !== 'superadmin' && auth?.user?.created_by)) && (
                <PaymentMethodCard
                  title={t('WhatsApp')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_whatsapp_enabled}
                  onToggle={(checked) => setData('is_whatsapp_enabled', checked)}
                  helpText={t("Configure WhatsApp settings for order notifications")}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp_number">{t("Phone Number")}</Label>
                      <Input
                        id="whatsapp_number"
                        value={data.whatsapp_number}
                        onChange={(e) => setData('whatsapp_number', e.target.value)}
                        placeholder={t("+1234567890")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("Enter your WhatsApp number with country code (e.g., +1234567890)")}
                      </p>
                      {errors.whatsapp_number && (
                        <p className="text-sm text-destructive">{errors.whatsapp_number}</p>
                      )}
                    </div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t("WhatsApp notifications work by generating a pre-filled message link. Message templates are configured in the Messaging Templates section below.")}
                      </AlertDescription>
                    </Alert>
                  </div>
                </PaymentMethodCard>
              )}

              {/* Telegram - For company users and sub-users */}
              {shouldShowMethod('telegram') && (auth?.user?.type === 'company' || (auth?.user?.type !== 'superadmin' && auth?.user?.created_by)) && (
                <PaymentMethodCard
                  title={t('Telegram')}
                  icon={<CreditCard className="h-5 w-5" />}
                  enabled={data.is_telegram_enabled}
                  onToggle={(checked) => setData('is_telegram_enabled', checked)}
                  helpText={t("Configure Telegram bot for order notifications")}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="telegram_bot_token">{t("Bot Token")}</Label>
                      <Input
                        id="telegram_bot_token"
                        value={data.telegram_bot_token}
                        onChange={(e) => setData('telegram_bot_token', e.target.value)}
                        placeholder={t("1234567890:AAbbbbccccddddxvGENZCi8Hd4B15M8xHV0")}
                        type="password"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("Get your bot token from @BotFather on Telegram")}
                      </p>
                      {errors.telegram_bot_token && (
                        <p className="text-sm text-destructive">{errors.telegram_bot_token}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telegram_chat_id">{t("Chat ID")}</Label>
                      <Input
                        id="telegram_chat_id"
                        value={data.telegram_chat_id}
                        onChange={(e) => setData('telegram_chat_id', e.target.value)}
                        placeholder={t("123456789")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("Get Chat ID from: https://api.telegram.org/bot<TOKEN>/getUpdates")}
                      </p>
                      {errors.telegram_chat_id && (
                        <p className="text-sm text-destructive">{errors.telegram_chat_id}</p>
                      )}
                    </div>
                    {data.telegram_bot_token && data.telegram_chat_id && (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(route('payment.settings.test-telegram'), {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                                },
                                body: JSON.stringify({
                                  telegram_bot_token: data.telegram_bot_token,
                                  telegram_chat_id: data.telegram_chat_id
                                })
                              });
                              const result = await response.json();
                              if (result.success) {
                                toast.success(result.message);
                              } else {
                                toast.error(result.message);
                              }
                            } catch (error) {
                              toast.error(t('Failed to test connection'));
                            }
                          }}
                        >
                          {t('Test Connection')}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {t('Send a test message to verify your bot configuration')}
                        </p>
                      </div>
                    )}
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t("Message templates are shared between WhatsApp and Telegram. Configure them in the Messaging Templates section below.")}
                      </AlertDescription>
                    </Alert>
                  </div>
                </PaymentMethodCard>
              )}

              </div>

              {/* Shared Messaging Templates - For company users and sub-users */}
              {(auth?.user?.type === 'company' || (auth?.user?.type !== 'superadmin' && auth?.user?.created_by)) && (
                <Card dir="rtl">
                  <CardHeader dir="rtl" className="flex flex-col items-end w-full text-start">
                    <div dir="rtl" className="w-full text-start">
                      <CardTitle>{"قوالب الرسائل"}</CardTitle>
                      <CardDescription>
                        {"قوالب رسائل مشتركة لإشعارات الواتساب والتليجرام"}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-start" dir="rtl">
                    {/* Message Template */}
                    <div className="space-y-2">
                      <Label htmlFor="messaging_message_template" className="block text-start">{t("Message Template")}</Label>
                      {/* Labeled template type selector */}
                      <div className="flex flex-wrap gap-2 rounded-xl bg-muted p-1">
                        {TEMPLATE_TYPES.map((tpl) => {
                          const isActive = activeTemplateType === tpl.key;
                          return (
                            <button
                              key={tpl.key}
                              type="button"
                              onClick={() => {
                                setActiveTemplateType(tpl.key);
                                setData('messaging_message_template', tpl.template.replace(/\n/g, '\\n'));
                              }}
                              className={cn(
                                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-all',
                                isActive
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
                              )}
                            >
                              <span>{tpl.emoji}</span>
                              {tpl.label}
                            </button>
                          );
                        })}
                      </div>
                      <Textarea
                        id="messaging_message_template"
                        ref={messageRef}
                        dir="rtl"
                        className="text-start"
                        value={(data.messaging_message_template || '').replace(/\\n/g, '\n')}
                        onChange={(e) => setData('messaging_message_template', e.target.value.replace(/\n/g, '\\n'))}
                        placeholder={t("طلب جديد رقم {order_no} من متجر {store_name}\nالعميل: {customer_name}\nالمجموع الكلي: {final_total}\n\nالمنتجات:\n{item_variable}")}
                        rows={6}
                      />
                      <div className="text-xs text-muted-foreground text-start">
                        <p className="font-medium mb-1 text-start">{"متغيرات الطلب:"} ({effectiveOrderVariables?.length || 0})</p>
                        <div className="flex flex-wrap gap-1">
                          {effectiveOrderVariables?.length > 0 ? (
                            effectiveOrderVariables.map((variable) => (
                              <button
                                key={variable}
                                type="button"
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 hover:bg-blue-100 transition text-xs cursor-pointer"
                                onClick={() => insertAtCursor(messageRef, toPlaceholder(variable), (v) => setData('messaging_message_template', v))}
                              >
                                {toPlaceholder(variable)}
                              </button>
                            ))
                          ) : (
                            <span className="text-muted-foreground">{"لا توجد متغيرات متاحة"}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-start">
                          {"ملاحظة: يدعم التليجرام تنسيق HTML، بينما يستخدم الواتساب نصاً عادياً"}
                        </p>
                      </div>
                      {errors.messaging_message_template && (
                        <p className="text-sm text-destructive text-start">{errors.messaging_message_template}</p>
                      )}
                    </div>

                    {/* Item Variable Format */}
                    <div className="space-y-2">
                      <Label htmlFor="messaging_item_template" className="block text-start">{t("Item Variable Format")}</Label>
                      <Textarea
                        id="messaging_item_template"
                        ref={itemRef}
                        dir="rtl"
                        className="text-start"
                        value={(data.messaging_item_template || '').replace(/\\n/g, '\n')}
                        onChange={(e) => setData('messaging_item_template', e.target.value.replace(/\n/g, '\\n'))}
                        placeholder="• {product_name} ({variant_name}) × {quantity} = {line_total}"
                        rows={3}
                      />
                      <div className="text-xs text-muted-foreground text-start">
                        <p className="font-medium mb-1 text-start">{"متغيرات المنتج:"} ({effectiveItemVariables?.length || 0})</p>
                        <div className="flex flex-wrap gap-1">
                          {effectiveItemVariables?.length > 0 ? (
                            effectiveItemVariables.map((variable) => (
                              <button
                                key={variable}
                                type="button"
                                className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200 hover:bg-green-100 transition text-xs cursor-pointer"
                                onClick={() => insertAtCursor(itemRef, toPlaceholder(variable), (v) => setData('messaging_item_template', v))}
                              >
                                {toPlaceholder(variable)}
                              </button>
                            ))
                          ) : (
                            <span className="text-muted-foreground">{"لا توجد متغيرات متاحة"}</span>
                          )}
                        </div>
                      </div>
                      {errors.messaging_item_template && (
                        <p className="text-sm text-destructive text-start">{errors.messaging_item_template}</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 justify-start">
                      <Button type="button" variant="outline" size="sm" onClick={restoreDefaults}>
                        <Undo2 className="h-4 w-4 ms-1" />
                        {"استعادة القالب الافتراضي"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard('قالب الرسالة', (data.messaging_message_template || '').replace(/\\n/g, '\n'))}
                      >
                        <Copy className="h-4 w-4 ms-1" />
                        {"نسخ قالب الرسالة"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard('قالب المنتج', (data.messaging_item_template || '').replace(/\\n/g, '\n'))}
                      >
                        <Copy className="h-4 w-4 ms-1" />
                        {"نسخ قالب المنتج"}
                      </Button>
                    </div>

                    {/* Live Preview */}
                    <div className="space-y-2">
                      <p className="font-medium text-start">{"معاينة مباشرة:"}</p>
                      <div
                        dir="rtl"
                        className="text-start p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm leading-relaxed whitespace-pre-wrap min-h-[60px]"
                      >
                        {previewText || "..."}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}


            </CardContent>
          </Card>

          {/* Important Notes */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t("Important:")}</strong> {t("These payment settings will be used for all subscription plan payments. Make sure to test your configuration before going live.")}
            </AlertDescription>
          </Alert>
        </div>
      </form>

      {/* Floating sticky save bar when form is dirty */}
      {isDirty && (
        <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-2 fade-in">
          <p className="text-sm text-muted-foreground">{t('Unsaved changes')}</p>
          <Button type="submit" form="payment-settings-form" disabled={processing}>
            <Save className="h-4 w-4 ms-2" />
            {processing ? t("Saving...") : t("Save Changes")}
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}