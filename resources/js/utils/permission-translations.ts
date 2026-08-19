// utils/permission-translations.ts
// Maps permission module keys and action verbs to Arabic labels so the roles
// & permissions screens render in Arabic instead of raw English slugs.

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  users: 'المستخدمون',
  roles: 'الأدوار والصلاحيات',
  coupon_system: 'نظام الكوبونات',
  cod_payments: 'الدفع عند الاستلام',
  product_reviews: 'تقييمات المنتجات',
  abandoned_carts: 'السلات المتروكة',
  digital_downloads: 'التحميلات الرقمية',
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
  analytics: 'التحليلات',
  notifications: 'الإشعارات',
  loyalty: 'نظام الولاء',
  plans: 'الخطط',
  plan_requests: 'طلبات الخطط',
  plan_orders: 'أوامر الخطط',
  referral: 'التسويق بالإحالة',
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

const SPECIAL_LABELS: Record<string, string> = {
  'manage-any-media': 'إدارة جميع الوسائط',
  'reset-password-users': 'إعادة تعيين كلمة مرور المستخدم',
  'toggle-status': 'تغيير الحالة',
  'process-transactions-pos': 'معالجة معاملات نقطة البيع',
  'settings-stores': 'إعدادات المتاجر',
  'settings-express-checkout': 'إعدادات الدفع السريع',
  'manage-digital-downloads': 'إدارة التحميلات الرقمية',
  'collect-cod-payments': 'تحصيل مدفوعات الدفع عند الاستلام',
  'manage-cod-payments': 'إدارة الدفع عند الاستلام',
};

/**
 * Build an Arabic, human-readable label for a permission slug.
 * Handles patterns like: create-users, edit-orders, manage-analytics,
 * view-digital-downloads, reset-password-users, settings-stores, ...
 */
export function translatePermissionName(name?: string, label?: string): string {
  if (!name) return label || '';

  if (SPECIAL_LABELS[name]) {
    return SPECIAL_LABELS[name];
  }

  const parts = name.split('-');
  const action = parts[0] || '';
  const moduleKey = parts.slice(1).join('_');
  const moduleAr = moduleKey ? MODULE_LABELS[moduleKey] || '' : '';

  if (action === 'toggle-status') {
    return 'تغيير الحالة';
  }
  if (action === 'reset-password') {
    return 'إعادة تعيين كلمة المرور';
  }
  if (action === 'settings') {
    return moduleAr ? `إعدادات ${moduleAr}` : (label || name);
  }
  if (action === 'manage' && moduleKey === 'dashboard') {
    return 'إدارة لوحة التحكم';
  }

  const actionAr = ACTION_LABELS[action];
  if (actionAr && moduleAr) {
    return `${actionAr} ${moduleAr}`;
  }
  if (moduleAr) {
    return moduleAr;
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