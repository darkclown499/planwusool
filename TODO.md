# ✅ تتبع تنفيذ نظام إشعارات التاجر (Merchant Notification System)

## المرحلة 1: البنية التحتية (Backend)

### 1.1 إنشاء جدول merchant_notifications
- [x] إنشاء ملف migration لجدول `merchant_notifications`
- [x] تشغيل `php artisan migrate`

### 1.2 إنشاء Model `MerchantNotification`
- [x] Model مع الخصائص والـ scopes المناسبة

### 1.3 إنشاء `MerchantNotificationService`
- [x] Service مع دوال: إنشاء إشعار، جلب إشعارات التاجر، عدد غير المقروء، علام مقروء

### 1.4 إنشاء `MerchantNotificationController`
- [x] Controller مع API: index, unreadCount, markRead, markAllRead

### 1.5 إنشاء Listeners للأحداث
- [x] مستمع `HandleOrderCreatedNotifications` لإشعار الطلب الجديد
- [x] مستمع `HandleLowStockNotification` للمنتجات منخفضة المخزون
- [x] مستمع `HandleNewReviewNotification` للمراجعات الجديدة
- [x] مستمع `HandleCanceledOrderNotification` للطلبات الملغية

### 1.6 تسجيل الأحداث في EventServiceProvider
- [x] ربط events مع listeners

### 1.7 إضافة route للإشعارات
- [x] إضافة route API في web.php

## المرحلة 2: واجهة المستخدم (Frontend)

### 2.1 إنشاء `AdminNotificationBell` Component
- [x] أيقونة جرس مع عداد
- [x] قائمة منسدلة بالإشعارات
- [x] علام مقروء عند النقر
- [x] رابط لكل إشعار

### 2.2 تحديث `app-header.tsx`
- [x] إضافة زر الجرس بين زر البحث وصورة المستخدم

### 2.3 تحديث `dashboard.tsx` - تفعيل Vital Alerts
- [x] إظهار الإشعارات الحقيقية من `dashboardData`
- [x] استخدام `dashboardData.alerts` من `DashboardController`

### 2.4 تحديث `DashboardController`
- [x] إضافة بيانات الإشعارات (alerts) إلى `dashboardData`

### 2.5 تحديث `app-sidebar.tsx`
- [x] ضمان ظهور تبويب الإشعارات بشكل بارز

## المرحلة 3: اختبار وتشغيل
- [ ] تشغيل `php artisan migrate`
- [ ] اختبار جرس الإشعارات
- [ ] اختبار Vital Alerts في لوحة التحكم

