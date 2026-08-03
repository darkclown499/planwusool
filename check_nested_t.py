import re
import os

# Files to check
files_to_check = [
    ('MasalahThemeProvider.tsx', 'resources/js/themes/masalah-kit'),
    ('MasalahStore.tsx', 'resources/js/themes/masalah-kit'),
    ('Footer.tsx', 'resources/js/themes/masalah-kit/components'),
    ('Header.tsx', 'resources/js/themes/masalah-kit/components'),
    ('HeroSlider.tsx', 'resources/js/themes/masalah-kit/components'),
    ('ProductCard.tsx', 'resources/js/themes/masalah-kit/components'),
    ('ProductDetail.tsx', 'resources/js/themes/masalah-kit/components'),
    ('Sidebar.tsx', 'resources/js/themes/masalah-kit/components'),
]

base_path = "C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1"

print("Checking for nested t() calls...")
print("=" * 70)
print()

for filename, subpath in files_to_check:
    file_path = os.path.join(base_path, subpath, filename)
    
    if os.path.exists(file_path):
        print(f"Checking: {filename}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Count nested t() calls
        nested_pattern = r"t\s*\(\s*t\s*\(['\"]([^'\"]+)['\"]\)\s*\)"
        matches = re.findall(nested_pattern, content)
        
        if matches:
            print(f"  Found {len(matches)} nested t() calls!")
            
            # Show a few examples
            for i, match in enumerate(matches[:3]):
                print(f"    {match}")
            if len(matches) > 3:
                print(f"    ... and {len(matches) - 3} more")
        else:
            print(f"  No nested t() calls found")
        
        print()
    else:
        print(f"File not found: {filename}")
        print()

print("=" * 70)
print("Done!")
print("=" * 70)
