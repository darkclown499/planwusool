import re, os, sys

sys.stdout.reconfigure(encoding='utf-8')

files = [
    'resources/js/themes/masalah-kit/MasalahThemeProvider.tsx',
    'resources/js/themes/masalah-kit/MasalahStore.tsx',
    'resources/js/themes/masalah-kit/components/Footer.tsx',
    'resources/js/themes/masalah-kit/components/Header.tsx',
    'resources/js/themes/masalah-kit/components/HeroSlider.tsx',
    'resources/js/themes/masalah-kit/components/ProductCard.tsx',
    'resources/js/themes/masalah-kit/components/ProductDetail.tsx',
    'resources/js/themes/masalah-kit/components/Sidebar.tsx',
]

total_fixes = 0

for filepath in files:
    if not os.path.exists(filepath):
        print(f'SKIP (not found): {filepath}')
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    fixes = 0

    # 1. Fix nested t() calls: t('t('text')') -> t('text')
    # Pattern: t('t('...')') or t("t("...")")
    content = re.sub(r"t\('t\('(.*?)'\)'\)", r"t('\1')", content)
    content = re.sub(r't\("t\("(.*?)"\)"\)', r't("\1")', content)

    # 2. Fix string literals with t() inside socialIcons labels: 't('text')' -> 'text'
    # Only in socialIcons label values
    content = re.sub(r"label: 't\('(.*?)'\)'", r"label: '\1'", content)
    content = re.sub(r'label: "t\("(.*?)"\)', r'label: "\1"', content)

    # 3. Fix MasalahThemeProvider.tsx copy object values: 't('text')' -> 'text'
    # These are string values in the copy object that should just be Arabic text
    content = re.sub(r": 't\('(.*?)'\)'", r": '\1'", content)
    content = re.sub(r': "t\("(.*?)"\)', r': "\1"', content)

    # 4. Fix deliveryAreas array: ['t('text')', ...] -> ['text', ...]
    content = re.sub(r"\[([^\]]*?)'t\('(.*?)'\)'([^\]]*?)\]", lambda m: f"[{m.group(1)}'{m.group(2)}'{m.group(3)}]", content)

    # 5. Fix raw Arabic strings missing t() wrapping in JSX expressions
    # Pattern: >text< where text is Arabic and not already wrapped in t()
    # Only wrap standalone Arabic text in JSX (between > and <)
    def wrap_arabic_in_jsx(m):
        text = m.group(1)
        # Skip if already wrapped in t()
        if text.startswith("t("):
            return m.group(0)
        # Skip if it's a JS expression variable reference
        if re.match(r'^\s*\w+\s*$', text):
            return m.group(0)
        # Skip if it contains HTML tags or JSX components
        if '<' in text or '{' in text:
            return m.group(0)
        # Skip if it's just a number or short word
        if len(text.strip()) <= 2 and not re.search(r'[\u0600-\u06FF]', text):
            return m.group(0)
        return f">{t('{text}')}<"

    # 6. Fix raw Arabic strings in JSX that are not wrapped in t()
    # Pattern: >arabic text< in JSX
    content = re.sub(r'>([^\s<]*?[\u0600-\u06FF][^\s<]*?)<', wrap_arabic_in_jsx, content)

    # 7. Fix toast.success and other string literals with t() inside
    # Pattern: 't('text')' -> t('text')
    content = re.sub(r"'t\('(.*?)'\)'", r"t('\1')", content)
    content = re.sub(r'"t\("(.*?)"\)', r't("\1")', content)

    # 8. Fix missing t() wrapping for Arabic strings in JSX attributes
    # Pattern: aria-label="arabic" or title="arabic" where arabic is not wrapped in t()
    def wrap_attr_arabic(m):
        attr_name = m.group(1)
        text = m.group(2)
        if re.search(r'[\u0600-\u06FF]', text) and not text.startswith('t('):
            return f'{attr_name}="{{t(\'{text}\')}}"'
        return m.group(0)

    # 9. Fix HeroSlider.tsx deliveryAreas.join() with t() wrapping
    # Pattern: .join('t('،')') -> .join(t('،'))
    content = re.sub(r"\.join\('t\('،\)'\)", ".join(t('،'))", content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixes = content.count("t('") - original.count("t('")
        print(f'FIXED: {filepath}')
        total_fixes += 1

print(f'\nTotal files fixed: {total_fixes}')