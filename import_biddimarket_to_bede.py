#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
استيراد منتجات biddimarket.ps إلى متجر bede.wusool.ps
الاستخدام:
  python import_biddimarket_to_bede.py
سيطلب منك الإيميل وكلمة السر بشكل آمن (لا تحفظ في الملف)
أو ضعها في متغيرات البيئة: WUSOOL_EMAIL و WUSOOL_PASSWORD
"""
import requests, csv, re, time, getpass, os
from urllib.parse import unquote

def sanitize_description(desc: str) -> str:
    """Sanitize scraped description: replace <br> tags with newlines (biddimarket import fix)"""
    if not desc:
        return ""
    # Replace <br>, <br/>, <br /> (case-insensitive) with newline
    return re.sub(r'<br\s*/?>', '\n', desc, flags=re.I)

WUSOOL_BASE = "https://wusool.ps"
BEDE_SLUG = "bede"
CSV_PATH = "biddimarket_full.csv"  # نفس المجلد

# قراءة الإيميل وكلمة السر بأمان
email = os.getenv("WUSOOL_EMAIL") or input("أدخل إيميل وصول (mahmoodfayyomi3@gmail.com): ").strip() or "mahmoodfayyomi3@gmail.com"
password = os.getenv("WUSOOL_PASSWORD") or getpass.getpass("أدخل كلمة السر: ").strip()

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*",
    "Accept-Language": "ar,en;q=0.9",
    "Referer": f"{WUSOOL_BASE}/login"
})

print("1. تسجيل الدخول...")
# جلب صفحة الدخول للحصول على CSRF
r = session.get(f"{WUSOOL_BASE}/login", timeout=15)
m = re.search(r'name="_token" value="([^"]+)"', r.text)
if not m:
    m = re.search(r'csrf-token" content="([^"]+)"', r.text)
csrf = m.group(1) if m else ""
print(f"   CSRF: {csrf[:20]}...")

# تسجيل الدخول
login_data = {"_token": csrf, "email": email, "password": password}
r2 = session.post(f"{WUSOOL_BASE}/login", data=login_data, timeout=15, allow_redirects=True)
if "dashboard" not in r2.text.lower() and r2.status_code not in (200, 302):
    print("   تحذير: قد يكون تسجيل الدخول فشل، جاري المحاولة...")
    print(f"   Status: {r2.status_code}, URL: {r2.url[:200]}")

# جلب قائمة المتاجر
print("2. جلب المتاجر...")
r3 = session.get(f"{WUSOOL_BASE}/stores", timeout=15)
# محاولة الحصول على storeId لـ bede
store_id = None
# من HTML
m = re.search(rf'/stores/(\d+)/[^"]*bede|bede[^"]*?/stores/(\d+)', r3.text, re.I)
if m:
    store_id = m.group(1) or m.group(2)
# محاولة أخرى: ابحث عن stores JSON في الصفحة
if not store_id:
    m = re.search(r'"id"\s*:\s*(\d+)[^}]*"slug"\s*:\s*"bede"', r3.text)
    if m:
        store_id = m.group(1)
if not store_id:
    # fallback: اسأل المستخدم
    store_id = input(f"لم أجد معرف المتجر تلقائياً، أدخل ID متجر bede (شوفه في رابط المتجر مثل /stores/123): ").strip()

print(f"   store_id = {store_id}")

if not store_id:
    print("❌ لم يتم العثور على معرف المتجر. أوقف.")
    exit(1)

# تجهيز الأقسام
print("3. قراءة CSV وإنشاء الأقسام...")
# سنحتاج map من اسم القسم -> category_id
category_map = {}

def get_or_create_category(cat_name):
    if cat_name in category_map:
        return category_map[cat_name]
    # حاول إنشاء قسم جديد
    # جلب CSRF جديد لصفحة إنشاء القسم
    try:
        r_cat_page = session.get(f"{WUSOOL_BASE}/categories/create", timeout=15)
        m = re.search(r'name="_token" value="([^"]+)"', r_cat_page.text)
        csrf2 = m.group(1) if m else csrf
        data = {
            "_token": csrf2,
            "name": cat_name,
            "slug": cat_name.replace(" ", "-"),
            "store_id": store_id,
            "is_active": "1"
        }
        r_create = session.post(f"{WUSOOL_BASE}/categories", data=data, timeout=15, allow_redirects=False)
        # حتى لو فشل (القسم موجود)، حاول جلبه
        # جلب قائمة الأقسام
        r_list = session.get(f"{WUSOOL_BASE}/categories", timeout=15)
        # ابحث عن القسم
        m = re.search(rf'"id"\s*:\s*(\d+)[^}}]*"name"\s*:\s*"{re.escape(cat_name)}"', r_list.text)
        if m:
            cid = m.group(1)
            category_map[cat_name] = cid
            return cid
        # fallback: حاول البحث بطريقة أخرى
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(r_list.text, 'html.parser')
        for td in soup.find_all(string=re.compile(re.escape(cat_name))):
            # صعب
            pass
    except Exception as e:
        print(f"   خطأ إنشاء قسم {cat_name}: {e}")
    # إذا فشل، استخدم القسم الافتراضي
    return None

# قراءة CSV
import csv
products = list(csv.DictReader(open(CSV_PATH, encoding='utf-8-sig')))
print(f"   وجدت {len(products)} منتج في الملف")

# إنشاء الأقسام أولاً (فريدة)
unique_cats = sorted(set(p['category'] for p in products if p['category']))
print(f"   الأقسام الفريدة: {unique_cats}")
for cat in unique_cats:
    cid = get_or_create_category(cat)
    print(f"   قسم: {cat} -> id={cid}")
    time.sleep(0.3)

# الآن إنشاء المنتجات
print("4. إنشاء المنتجات...")
success = 0
failed = 0
for idx, p in enumerate(products, 1):
    name = p['name'].strip()
    price = p['price'].strip() or "0"
    images = p['images'].strip()
    category = p['category'].strip()
    cat_id = category_map.get(category)
    # إذا لم نجد cat_id، نحاول إنشاؤه مرة أخرى أو نتركها فارغة
    # جلب CSRF لصفحة إنشاء المنتج
    try:
        r_prod_page = session.get(f"{WUSOOL_BASE}/products/create", timeout=15)
        m = re.search(r'name="_token" value="([^"]+)"', r_prod_page.text)
        csrf_prod = m.group(1) if m else csrf
        # SKU عشوائي
        sku = f"BD-{idx:04d}"
        # Sanitize description: handle scraped HTML <br> tags
        raw_desc = (p.get('description') or '').strip()
        clean_desc = sanitize_description(raw_desc).strip() if raw_desc else ""
        final_desc = clean_desc if clean_desc else f"مستورد من biddimarket.ps - {p['source_url']}"
        data = {
            "_token": csrf_prod,
            "name": name,
            "sku": sku,
            "price": price,
            "sale_price": "",
            "stock": "100",
            "cover_image": images,
            "images": images,
            "category_id": cat_id or "",
            "store_id": store_id,
            "is_active": "1",
            "description": final_desc,
        }
        r_create = session.post(f"{WUSOOL_BASE}/products", data=data, timeout=20, allow_redirects=False)
        if r_create.status_code in (200, 302, 201):
            print(f"   [{idx}/{len(products)}] ✓ {name} - {price} ₪")
            success += 1
        else:
            print(f"   [{idx}/{len(products)}] ✗ {name} -> {r_create.status_code}")
            failed += 1
        time.sleep(0.4)
        if idx % 50 == 0:
            print(f"--- تم {idx} منتج ---")
    except Exception as e:
        print(f"   [{idx}] خطأ {name}: {e}")
        failed += 1

print(f"\n✅ انتهى: نجح {success} / فشل {failed} من أصل {len(products)}")
print("تحقق من متجرك: https://bede.wusool.ps")
