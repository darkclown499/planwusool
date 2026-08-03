# ✅ TODO — المرحلة الأولى: الميزات التنافسية (مكتملة)

## الميزة 1: نقاط الولاء والمكافآت (Loyalty Points) ✅
- [x] 1.1 إنشاء migration لجدول `loyalty_settings`
- [x] 1.2 إنشاء migration لجدول `loyalty_transactions`
- [x] 1.3 إنشاء Model `LoyaltySetting`
- [x] 1.4 إنشاء Model `LoyaltyTransaction`
- [x] 1.5 إنشاء Service `LoyaltyService`
- [x] 1.6 تكامل مع `OrderService` (كسب نقاط عند الطلب)
- [x] 1.7 إنشاء Controller + Routes
- [x] 1.8 صفحة إعدادات + سجل النقاط في لوحة التحكم
- [x] 1.9 API للمتجر (balance + history)
- [x] 1.10 أذونات في PermissionSeeder
- [x] 1.11 عناصر القائمة الجانبية في Sidebar

## الميزة 2: تقييمات ومراجعات المنتجات (Reviews & Ratings) ✅
- [x] 2.1 إنشاء migration لجدول `product_reviews`
- [x] 2.2 إنشاء Model `ProductReview`
- [x] 2.3 إنشاء Controller + API Routes
- [x] 2.4 صفحة إدارة المراجعات في لوحة التحكم
- [x] 2.5 الموافقة والرد على المراجعات
- [x] 2.6 تصدير المراجعات CSV
- [x] 2.7 أذونات في PermissionSeeder
- [x] 2.8 عناصر القائمة الجانبية في Sidebar
- [x] 2.9 Relationship في Product Model

## الميزة 3: استرجاع السلة المتروكة (Abandoned Cart Recovery) ✅
- [x] 3.1 إنشاء migration لجدول `abandoned_carts`
- [x] 3.2 إنشاء Model `AbandonedCart`
- [x] 3.3 إنشاء Service `AbandonedCartService`
- [x] 3.4 إنشاء Command مجدول `CheckAbandonedCarts`
- [x] 3.5 تسجيل الـ command في `Kernel.php`
- [x] 3.6 صفحة استرجاع السلات في لوحة التحكم
- [x] 3.7 إرسال تذكير يدوي/تلقائي
- [x] 3.8 قالب بريد التذكير
- [x] 3.9 API تتبع السلة (CartTrackingController)
- [x] 3.10 أذونات في PermissionSeeder
- [x] 3.11 عناصر القائمة الجانبية في Sidebar

## الميزة 4: المنتجات الرقمية (Digital Downloads) ✅
- [x] 4.1 إنشاء migration لجدول `digital_downloads`
- [x] 4.2 إنشاء Model `DigitalDownload`
- [x] 4.3 إنشاء Controller + Routes (رابط تنزيل آمن)
- [x] 4.4 API للمتجر (customerDownloads + orderDownloads + download)
- [x] 4.5 تكامل مع `OrderService` عند إنشاء طلب بمنتجات رقمية
- [x] 4.6 أذونات في PermissionSeeder
- [x] 4.7 Product model يدعم `is_downloadable` + `downloadable_file`

## الخطوات النهائية ✅
- [x] 5.1 إنشاء جميع الـ migrations (5 جداول)
- [x] 5.2 إنشاء جميع الـ Models (5 موديلات)
- [x] 5.3 إنشاء جميع الـ Controllers (5 + 1 API)
- [x] 5.4 إنشاء الـ Services (2)
- [x] 5.5 إنشاء Command + Mail + Blade View
- [x] 5.6 إضافة المسارات في `routes/web.php`
- [x] 5.7 إضافة الأذونات في `PermissionSeeder`
- [x] 5.8 إضافة صفحات React (4 صفحات)
- [x] 5.9 إضافة عناصر القائمة الجانبية في `app-sidebar.tsx`
- [ ] 5.10 تشغيل `php artisan migrate` (يدوي)
- [ ] 5.11 تشغيل `php artisan db:seed --class=PermissionSeeder` (يدوي)

## ملاحظات
- كل الملفات جاهزة للتشغيل
- المطلوب: تشغيل `php artisan migrate` + `php artisan db:seed --class=PermissionSeeder` بعد الموافقة

---

# 🚀 TODO — المرحلة الثانية: الميزات التنافسية (قيد التنفيذ)

## الميزة 1: نظام الكوبونات المتقدمة (Advanced Marketing Coupons) 🏗️
### قاعدة البيانات والنماذج ✅
- [x] 1.1 إنشاء migration للجدول الرئيسي `advanced_coupons`
  - أنواع الخصم: `fixed` | `percentage` | `free_shipping` | `buy_one_get_one`
  - حقل `max_discount_amount` للحد الأقصى لقيمة الخصم (حماية هامش الربح)
  - قيود مالية: `minimum_order_amount`
  - قيود استخدام: `usage_limit` (إجمالي) + `per_customer_limit` (لكل عميل)
  - نطاق التطبيق: `exclude_on_sale_items` (استثناء المنتجات المخفضة)
  - الجمهور: `first_order_only` (للطلبات الأولى فقط)
  - الوقت: `starts_at` + `expires_at` (تاريخ ووقت دقيق)
- [x] 1.2 إنشاء migration لجدول الربط `coupon_product`
  - ربط الكوبون بمنتجات محددة
  - حقل `excluded` boolean لاستثناء منتجات معينة
- [x] 1.3 إنشاء migration لجدول الربط `coupon_category`
  - ربط الكوبون بتصنيفات محددة
- [x] 1.4 إنشاء migration لجدول `coupon_regions`
  - قيود جغرافية: بلد (`country_id`) + ولاية (`state_id`) + مدينة (`city_id`)
- [x] 1.5 إنشاء migration لجدول `coupon_usages`
  - تتبع الاستخدام: `customer_identifier` (هاتف/بريد) + `customer_id` + `order_id`
- [x] 1.6 إنشاء Model `AdvancedCoupon`
  - علاقات: products / excludedProducts / categories / regions / usages / bogoProduct
  - دوال تحقق: `isActiveNow` / `isUsageLimitExceeded` / `isPerCustomerLimitExceeded` / `validateForUse`
  - دوال احتساب: `calculateDiscount` (fixed/percentage/free_shipping/BOGO) / `calculateBogoDiscount`
  - `recordUsage` + `generateUniqueCode`
- [x] 1.7 إنشاء Model `CouponRegion` (علاقات coupon/country/state/city)
- [x] 1.8 إنشاء Model `CouponUsage` (علاقات coupon/order/customer)
- [ ] 1.9 إنشاء Service `AdvancedCouponService` (تطبيق الخصم + التحقق المتكامل)
- [ ] 1.10 إنشاء Controller + Routes (إدارة الكوبونات + API تحقق)
- [ ] 1.11 صفحة إدارة الكوبونات المتقدمة في لوحة التحكم (React)
- [ ] 1.12 تكامل مع `CartCalculationService` و `OrderService`
- [ ] 1.13 أذونات في `PermissionSeeder`
- [ ] 1.14 عناصر القائمة الجانبية في `app-sidebar.tsx`
- [ ] 1.15 تشغيل `php artisan migrate` (يدوي)

## الميزة 2: نظام الدفع عند الاستلام المتقدم (Advanced COD) ⏳
- [ ] 2.1 إنشاء migration لجدول `cod_payments`
- [ ] 2.2 إنشاء Model `CodPayment`
- [ ] 2.3 إنشاء Service `CodPaymentService`
- [ ] 2.4 تتبع المدفوعات الجزئية والكاملة
- [ ] 2.5 تحليلات وتسوية الحسابات مع شركات التوصيل
- [ ] 2.6 صفحة إدارة في لوحة التحكم (React)
- [ ] 2.7 أذونات + Sidebar
