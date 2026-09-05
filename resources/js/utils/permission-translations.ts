// utils/permission-translations.ts
// Maps permission module keys and action verbs to Arabic labels so the roles
// & permissions screens render in Arabic instead of raw English slugs.

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  users: 'المستخدمون',
  roles: 'الأدوار والصلاحيات',
  coupon_system: 'قواعد الخصم',
  cod_payments: 'الدفع عند الاستلام',
  product_reviews: 'تقييمات المنتجات',
  abandoned_carts: 'السلال المتروكة',
  digital_downloads: 'التحميلات الرقمية',
  digital_products: 'المنتجات الرقمية',
  stores: 'إدارة المتاجر',
  orders: 'إدارة الطلبات',
  settings: 'الإعدادات العامة',
  multimedia: 'الوسائط',
  media: 'الوسائط',
  products: 'المنتجات',
  categories: 'التصنيفات',
  customers: 'العملاء',
  tax: 'الضرائب',
  shipping: 'الشحن',
  analytics: 'التقارير',
  notifications: 'الإشعارات',
  loyalty: 'نظام الولاء',
  plans: 'الخطط',
  plan_requests: 'طلبات الخطط',
  plan_orders: 'أوامر الخطط',
  referral: 'التسويق بالإحالة',
  referral_payout: 'مدفوعات الإحالة',
  payout_referral: 'مدفوعات الإحالة',
  abandoned_cart_reminders: 'تذكيرات السلال المتروكة',
  landing_page: 'صفحة الهبوط',
  pos: 'نقطة البيع',
  express_checkout: 'الدفع السريع',
  coupons: 'الكوبونات',
  advanced_coupons: 'الكوبونات المتقدمة',
  payments: 'المدفوعات',
  business: 'الشركات',
  businesses: 'الشركات',
  companies: 'الشركات',
  languages: 'اللغات',
  webhooks: 'خطافات الويب',
  cache: 'الذاكرة المؤقتة',
  system: 'النظام',
};

/**
 * Object (genitive) form of a module used after action verbs so phrases read
 * "إدارة المستخدمين / عرض المتاجر" instead of doubling prefixes like
 * "إدارة إدارة المتاجر" or mixing cases like "إدارة المستخدمون".
 */
export const MODULE_OBJECT_LABELS: Record<string, string> = {
  users: 'المستخدمين',
  stores: 'المتاجر',
  orders: 'الطلبات',
  settings: 'الإعدادات العامة',
  products: 'المنتجات',
  categories: 'التصنيفات',
  customers: 'العملاء',
  media: 'الوسائط',
  multimedia: 'الوسائط',
  coupons: 'الكوبونات',
  advanced_coupons: 'الكوبونات المتقدمة',
  digital_downloads: 'التحميلات الرقمية',
  digital_products: 'المنتجات الرقمية',
};

export const ACTION_LABELS: Record<string, string> = {
  manage: 'إدارة',
  view: 'عرض',
  create: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  export: 'تصدير',
  import: 'استيراد',
  upload: 'رفع',
  download: 'تنزيل',
  request: 'طلب',
  subscribe: 'الاشتراك',
  side: 'اشتراك',
  reply: 'الرد على',
  approve: 'الموافقة على',
  reject: 'رفض',
  process: 'معالجة',
  collect: 'تحصيل',
  send: 'إرسال',
  toggle: 'تغيير',
  reset: 'إعادة تعيين',
  settings: 'إعدادات',
};

export const SPECIAL_LABELS: Record<string, string> = {
  'manage-any-media': 'إدارة جميع الوسائط',
  'change-status-users': 'تغيير حالة المستخدمين',
  'toggle-status-users': 'تغيير حالة المستخدمين',
  'manage-referral-payout': 'إدارة مدفوعات الإحالة',
  'manage-payout-referral': 'إدارة مدفوعات الإحالة',
  'toggle-status-coupon-system': 'تعديل حالة قواعد الخصم',
  'send-abandoned-cart-reminders': 'إرسال تذكيرات السلال',
  'download-digital-products': 'تنزيل المنتجات الرقمية',
  'toggle-status-advanced-coupons': 'تعديل حالة الكوبونات المتقدمة',
  'reset-password-users': 'إعادة تعيين كلمة مرور المستخدم',
  'settings-stores': 'إعدادات المتاجر',
  'settings-express-checkout': 'إعدادات الدفع السريع',
  'manage-digital-downloads': 'إدارة التحميلات الرقمية',
  'collect-cod-payments': 'تحصيل مدفوعات الدفع عند الاستلام',
  'manage-cod-payments': 'إدارة الدفع عند الاستلام',
};

/**
 * Build an Arabic, human-readable label for a permission slug.
 * Handles patterns like: create-users, edit-orders, manage-analytics,
 * view-digital-downloads, toggle-status-coupon-system, settings-stores, ...
 */
export function translatePermissionName(name?: string, label?: string): string {
  if (!name) return label || '';

  if (SPECIAL_LABELS[name]) {
    return SPECIAL_LABELS[name];
  }

  const parts = name.split('-');
  const action = parts[0] || '';
  const moduleKey = parts.slice(1).join('_');

  const moduleLabel = moduleKey ? MODULE_LABELS[moduleKey] || '' : '';
  // Prefer the object form (genitive) for phrasing after action verbs, falling
  // back to the module label when there is no dedicated object form.
  const objectLabel = moduleKey
    ? MODULE_OBJECT_LABELS[moduleKey] || moduleLabel
    : '';

  if (action === 'toggle-status' && objectLabel) {
    return `تغيير حالة ${objectLabel}`;
  }
  if (action === 'reset-password' && objectLabel) {
    return `إعادة تعيين كلمة مرور ${objectLabel}`;
  }
  if (action === 'settings') {
    return objectLabel ? `إعدادات ${objectLabel}` : (label || name);
  }

  const actionAr = ACTION_LABELS[action];
  if (actionAr && objectLabel) {
    // Avoid duplication like "إدارة إدارة المتاجر".
    if (objectLabel.startsWith(`${actionAr} `)) {
      return objectLabel;
    }
    return `${actionAr} ${objectLabel}`;
  }
  if (moduleLabel) {
    return moduleLabel;
  }

  return label || name;
}

/**
 * Render the Arabic label for a permission module group header.
 * Accepts keys like "users", "coupon_system", "product_reviews".
 */
export function getModuleLabel(moduleKey: string): string {
  if (!moduleKey) return moduleKey;
  return MODULE_LABELS[moduleKey] || MODULE_LABELS[moduleKey.replace(/-/g, '_')] || moduleKey;
}