# ✅ TODO — المرحلة الثانية: الميزات التنافسية المتقدمة

## المرحلة 1: الكوبونات المتقدمة (Advanced Coupons) — ✅ مكتملة

### حالة التنفيذ الحالية
- [x] 1.1 إنشاء migrations (5 جداول): `advanced_coupons`, `coupon_product`, `coupon_category`, `coupon_regions`, `coupon_usages`
- [x] 1.2 إنشاء Models (3): `AdvancedCoupon`, `CouponRegion`, `CouponUsage`
- [x] 1.3 إنشاء Service `AdvancedCouponService` (تحقق + حساب خصم + تسجيل استخدام + إحصائيات)
- [x] 1.4 إنشاء Controller + Routes + API تحقق (`api/advanced-coupon/validate`)
- [x] 1.5 إنشاء صفحات React (index/create/edit)
- [x] 1.6 تكامل `CartCalculationService` + `OrderService` (تسجيل الاستخدام عند الطلب)
- [x] 1.7 إضافة عناصر القائمة الجانبية في `app-sidebar.tsx`
- [x] 1.8 إضافة أذونات مخصصة للكوبونات المتقدمة في `PermissionSeeder`
- [x] 1.9 إضافة الأذونات لدور الشركة (company) في `RoleSeeder`
- [x] 1.10 تحديث `routes/web.php` لاستخدام الأذونات المخصصة
- [x] 1.11 تحديث `app-sidebar.tsx` لاستخدام `manage-advanced-coupons`
- [x] 1.12 تشغيل `php artisan migrate` (تم — جميع الجداول موجودة)
- [x] 1.13 تشغيل `php artisan db:seed --class=PermissionSeeder` + `RoleSeeder` (تم بدون أخطاء)
- [x] 1.14 تحديث `config/role-permissions.php` + التحقق من صلاحيات دور الشركة

### ملاحظات التحقق
- تم التحقق من إرفاق أذونات الكوبونات المتقدمة (7 أذونات) بدور الشركة (company) بنجاح
- جميع الفحوصات اللغوية (PHP syntax) سليمة

---

## المرحلة 2: نظام الدفع عند الاستلام المتقدم (Advanced COD) — 🏗️ قيد التنفيذ

### قواعد البيانات ✅
- [x] 2.1 إنشاء migration لجدول `cod_payments` (تتبع المدفوعات + تسوية)
- [x] 2.2 إنشاء migration لجدول `cod_payment_history` (سجل الأقساط/الدفعات الجزئية)
- [x] 2.3 تنفيذ عمليات التهجير (Migration) — تم بنجاح

### المنطق البرمجي والربط
- [ ] 2.4 إنشاء Models (`CodPayment` + `CodPaymentHistory`)
- [ ] 2.5 إنشاء Service `CodPaymentService` (تسجيل دفعة، أقساط جزئية، تسوية، تحليلات)
- [ ] 2.6 إنشاء Controller + Routes
- [ ] 2.7 تكامل مع `OrderService` (إنشاء سجل COD تلقائياً عند طلب COD)
- [ ] 2.8 ربط مع شركات التوصيل (API Integration)

### الواجهات
- [ ] 2.9 صفحة إدارة المدفوعات React
- [ ] 2.10 صفحة تفاصيل الطلب + التحليلات
- [ ] 2.11 أذونات في `PermissionSeeder` + `RoleSeeder`
- [ ] 2.12 عناصر القائمة الجانبية في `app-sidebar.tsx`

---

## المرحلة 3: الميزات القادمة (اختياري)
- نظام الإشعارات الذكية
- نظام المخزون المتقدم
- تحسينات واجهة المتجر (Quick View / Recently Viewed / Compare)

## المرحلة 4: الخطوات النهائية
- [ ] تشغيل `php artisan migrate`
- [ ] تشغيل `php artisan db:seed`
- [ ] بناء الواجهات الأمامية `npm run build`
- [ ] اختبار شامل للميزات

## ملاحظات
- كل مرحلة تُنفذ بشكل مستقل لتقليل تداخل الأخطاء
- بعد كل مرحلة: حفظ التغييرات (Commit)

