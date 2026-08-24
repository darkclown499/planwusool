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

export function getPolicyContent(
  key: PolicyPageKey['key'],
  vars: { STORE_NAME: string; STORE_PHONE: string; STORE_CITY: string }
): { title: string; body: string } {
  const raw = RAW_TEMPLATES[key];
  return {
    title: interpolatePolicy(raw.title, vars),
    body: interpolatePolicy(raw.body, vars),
  };
}
