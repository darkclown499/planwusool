import React from 'react';

export interface PolicyPageKey {
  key: 'about' | 'shipping' | 'privacy';
  label: string;
}

export const POLICY_LINKS: PolicyPageKey[] = [
  { key: 'about', label: 'من نحن' },
  { key: 'shipping', label: 'الشحن والتوصيل' },
  { key: 'privacy', label: 'سياسة الخصوصية' },
];

// Merchant-managed content keys — resolved first if merchant has saved pages/settings
const PAGE_SLUG_MAP: Record<PolicyPageKey['key'], string[]> = {
  about: ['about', 'about-us', 'من-نحن'],
  shipping: ['shipping', 'delivery', 'الشحن-والتوصيل', 'الشحن'],
  privacy: ['privacy', 'privacy-policy', 'سياسة-الخصوصية'],
};

const RAW_TEMPLATES: Record<PolicyPageKey['key'], { title: string; body: string }> = {
  about: {
    title: 'من نحن',
    body: `مرحباً بكم في {STORE_NAME}
{STORE_NAME} هو وجهتكم للأناقة العصرية في {STORE_CITY}. نختار كل قطعة بعناية لنمنحكم إطلالة مميزة وجودة تستحقونها.

📍 موقعنا: {STORE_CITY}
📞 للتواصل والاستفسار: {STORE_PHONE}

نحن هنا لخدمتكم — تشكيلات جديدة كل أسبوع، وخدمة عملاء تهتم بتفاصيلكم.`,
  },
  shipping: {
    title: 'الشحن والتوصيل',
    body: `الشحن والتوصيل - {STORE_NAME}
نوفر خدمة توصيل سريعة من {STORE_CITY} إلى جميع المدن خلال 2 إلى 4 أيام عمل. تكلفة الشحن تُحتسب عند إتمام الطلب، والدفع عند الاستلام متاح.

📦 التوصيل داخل {STORE_CITY}: خلال 24 ساعة
🚚 خارج {STORE_CITY}: 2-4 أيام
📞 للاستفسار عن شحنتكم: {STORE_PHONE}

فريق {STORE_NAME} يتابع طلبكم حتى وصوله بأمان.`,
  },
  privacy: {
    title: 'سياسة الخصوصية',
    body: `سياسة الخصوصية - {STORE_NAME}
خصوصيتكم تهمنا في {STORE_NAME} ({STORE_CITY}). نجمع بياناتكم فقط لتحسين تجربة التسوق ولا نشاركها مع أي جهة خارجية دون موافقتكم.

🔒 البيانات محفوظة بشكل آمن ومشفر
📄 لكم حق طلب تعديل أو حذف بياناتكم في أي وقت
📞 للتواصل حول الخصوصية: {STORE_PHONE}

باستخدامكم متجر {STORE_NAME} فإنكم توافقون على هذه السياسة.`,
  },
};

export function interpolatePolicy(text: string, vars: { STORE_NAME: string; STORE_PHONE: string; STORE_CITY: string }): string {
  return text
    .replaceAll('{STORE_NAME}', vars.STORE_NAME || 'متجرنا')
    .replaceAll('{STORE_PHONE}', vars.STORE_PHONE || '—')
    .replaceAll('{STORE_CITY}', vars.STORE_CITY || '—');
}

/**
 * Resolve policy content from merchant-managed pages/settings first.
 * Checks: storeContent pages array (custom store pages), storeSettings content keys,
 * then falls back to interpolated template using real store vars (no demo data).
 */
export function getPolicyContent(
  key: PolicyPageKey['key'],
  vars: { STORE_NAME: string; STORE_PHONE: string; STORE_CITY: string },
  merchantPages?: any[] | null,
  merchantContent?: any | null
): { title: string; body: string } {
  // 1) Try merchant custom pages (storePages prop / storeContent pages)
  const pages: any[] = Array.isArray(merchantPages) ? merchantPages : (Array.isArray(merchantContent?.pages) ? merchantContent.pages : []);
  for (const slug of PAGE_SLUG_MAP[key] || []) {
    const hit = pages.find((p: any) => String(p.slug || '').toLowerCase() === slug);
    if (hit && typeof hit.content === 'string' && hit.content.trim().length > 20) {
      const text = hit.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      // If HTML content is rich, return stripped text bounded
      if (text.length > 30) return { title: hit.title || RAW_TEMPLATES[key].title, body: hit.content };
    }
  }
  // 2) Try merchant settings content keys (storeSettings.about etc)
  if (merchantContent) {
    const directKeys: Record<string, string[]> = {
      about: ['about_content', 'store_about', 'about_text'],
      shipping: ['shipping_content', 'shipping_policy', 'delivery_text'],
      privacy: ['privacy_content', 'privacy_policy', 'privacy_text'],
    };
    for (const ck of directKeys[key] || []) {
      const v = merchantContent[ck] ?? merchantContent?.settings?.[ck];
      if (typeof v === 'string' && v.trim().length > 20) {
        return { title: RAW_TEMPLATES[key].title, body: v.trim() };
      }
    }
  }
  const raw = RAW_TEMPLATES[key];
  return {
    title: interpolatePolicy(raw.title, vars),
    body: interpolatePolicy(raw.body, vars),
  };
}
