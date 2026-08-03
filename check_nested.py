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
    nested = re.findall(r"t\(t\(['\"](.*?)['\"]\)\)", content)
    if nested:
        print(f'{f}: {len(nested)} nested t() calls')
        for n in nested:
            print(f'  -> {n}')
    else:
        print(f'{f}: no nested t() calls')