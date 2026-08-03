import os
import re

# Files to check
files_to_check = [
    ('C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\MasalahStore.tsx', 'MasalahStore'),
    ('C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\components\\Header.tsx', 'Header'),
    ('C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\components\\HeroSlider.tsx', 'HeroSlider'),
]

for file_path, file_name in files_to_check:
    if os.path.exists(file_path):
        print(f'=== {file_name}.tsx ===')
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find t('t(' patterns
        nested_pattern = r"t\s*\(\s*t\s*\(['\"]([^'\"]+)['\"]\)\s*\)"
        matches = re.findall(nested_pattern, content)
        
        if matches:
            print(f'Found {len(matches)} nested t() calls:')
            for i, match in enumerate(matches):
                print(f'  {i+1}. t("{match}")')
        else:
            print('No nested t() calls found')
        
        print()
