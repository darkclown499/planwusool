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

for f in files:
    if not os.path.exists(f):
        print(f'NOT FOUND: {f}')
        continue
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    lines = content.split('\n')
    print(f'\n=== {f} ===')
    for i, line in enumerate(lines, 1):
        if re.search(r'[\u0600-\u06FF]', line):
            print(f'  Line {i}: {line.strip()[:120]}')