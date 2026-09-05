export const orderStatusAr: Record<string, string> = {
  pending: 'قيد الانتظار',
  Pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  Confirmed: 'مؤكد',
  processing: 'قيد التجهيز',
  Processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  Shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  Delivered: 'تم التسليم',
  cancelled: 'ملغي',
  Cancelled: 'ملغي',
  canceled: 'ملغي',
  Canceled: 'ملغي',
  failed: 'فشل',
  Failed: 'فشل',
  refunded: 'مسترجع',
  Refunded: 'مسترجع',
  returned: 'مرتجع',
  Returned: 'مرتجع',
  completed: 'مكتمل',
  Completed: 'مكتمل',
  'Order Placed': 'تم إنشاء الطلب',
  'Payment Confirmed': 'تأكيد الدفع',
  'Order Processing': 'قيد التجهيز',
};

export const paymentStatusAr: Record<string, string> = {
  pending: 'في انتظار الدفع',
  Pending: 'في انتظار الدفع',
  paid: 'مدفوع',
  Paid: 'مدفوع',
  failed: 'فشل الدفع',
  Failed: 'فشل الدفع',
  refunded: 'تم الاسترجاع',
  Refunded: 'تم الاسترجاع',
  partially_refunded: 'استرجاع جزئي',
  'Partially Refunded': 'استرجاع جزئي',
  unpaid: 'غير مدفوع',
  Unpaid: 'غير مدفوع',
};

export const returnStatusAr: Record<string, string> = {
  requested: 'جديد',
  approved: 'مقبول',
  rejected: 'مرفوض',
  in_transit: 'قيد الشحن',
  received: 'مستلم',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const returnRefundStatusAr: Record<string, string> = {
  none: 'لا يوجد استرداد',
  pending: 'قيد الانتظار',
  partial: 'استرداد جزئي',
  refunded: 'تم الاسترداد',
};

export function tReturnStatus(status: string): string {
  if (!status) return '';
  const key = String(status).trim();
  return returnStatusAr[key] ?? returnStatusAr[key.toLowerCase()] ?? key;
}

export function tReturnRefundStatus(status: string): string {
  if (!status) return '';
  const key = String(status).trim();
  return returnRefundStatusAr[key] ?? returnRefundStatusAr[key.toLowerCase()] ?? key;
}

export const paymentMethodAr: Record<string, string> = {
  cod: 'الدفع عند الاستلام',
  cash: 'نقدًا',
  'Cash on Delivery': 'الدفع عند الاستلام',
  cash_on_delivery: 'الدفع عند الاستلام',
  credit_card: 'بطاقة ائتمان',
  'Credit Card': 'بطاقة ائتمان',
  paypal: 'باي بال',
  PayPal: 'باي بال',
  bank_transfer: 'تحويل بنكي',
  bank: 'تحويل بنكي',
  'Bank Transfer': 'تحويل بنكي',
  stripe: 'سترايب',
  paystack: 'باي ستاك',
  razorpay: 'رازورباي',
  mercadopago: 'ميركادو باجو',
  flutterwave: 'فلاترويف',
  paytabs: 'باي تابس',
  whatsapp: 'واتساب',
  telegram: 'تيليجرام',
};

export function tOrderStatus(status: string): string {
  if (!status) return '';
  const key = String(status).trim();
  return orderStatusAr[key] ?? orderStatusAr[key.toLowerCase()] ?? key;
}

export function tPaymentStatus(status: string): string {
  if (!status) return '';
  const key = String(status).trim();
  return paymentStatusAr[key] ?? paymentStatusAr[key.toLowerCase()] ?? key;
}

export function tPaymentMethod(method: string): string {
  if (!method) return '';
  const key = String(method).trim();
  return paymentMethodAr[key] ?? paymentMethodAr[key.toLowerCase()] ?? key;
}

export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'] as const;
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'] as const;

// Primary CTA mapping — single action per status
export const primaryActionByStatus: Record<string, { label: string; next: string }> = {
  pending: { label: 'تأكيد الطلب', next: 'confirmed' },
  confirmed: { label: 'بدء التجهيز', next: 'processing' },
  processing: { label: 'جاهز للتوصيل', next: 'shipped' },
  shipped: { label: 'تم الشحن', next: 'delivered' },
};
