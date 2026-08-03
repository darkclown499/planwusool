import os
import re

def check_nested_t_calls():
    # Files to check
    files_to_check = [
        ('MasalahThemeProvider.tsx', 'resources/js/themes/masalah-kit'),
        ('MasalahStore.tsx', 'resources/js/themes/masalah-kit'),
        ('components/Footer.tsx', 'resources/js/themes/masalah-kit'),
        ('components/Header.tsx', 'resources/js/themes/masalah-kit'),
        ('components/HeroSlider.tsx', 'resources/js/themes/masalah-kit'),
        ('components/ProductCard.tsx', 'resources/js/themes/masalah-kit'),
        ('components/ProductDetail.tsx', 'resources/js/themes/masalah-kit'),
        ('components/Sidebar.tsx', 'resources/js/themes/masalah-kit'),
    ]
    
    base_path = "C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1"
    
    print("=" * 70)
    print("Checking for nested t() calls in Masalah Kit Files")
    print("=" * 70)
    print()
    
    total_files = len(files_to_check)
    total_nested_calls = 0
    files_with_nested = 0
    
    for i, (filename, subpath) in enumerate(files_to_check, 1):
        file_path = os.path.join(base_path, subpath, filename)
        
        if os.path.exists(file_path):
            print(f"[{i}/{total_files}] Checking: {filename}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Look for t('t(' pattern
            # This is a simple string search since we're looking for literal patterns
            pattern1 = "t('t("
            pattern2 = 't("t('
            
            count1 = content.count(pattern1)
            count2 = content.count(pattern2)
            
            total_in_file = count1 + count2
            
            if total_in_file > 0:
                print(f"  Found {total_in_file} nested t() calls!")
                total_nested_calls += total_in_file
                files_with_nested += 1
                
                # Show examples
                lines = content.split('\n')
                example_lines = []
                for j, line in enumerate(lines):
                    if pattern1 in line or pattern2 in line:
                        example_lines.append(f"    Line {j+1}: {line.strip()[:100]}...")
                        if len(example_lines) >= 2:
                            break
                
                for example in example_lines:
                    print(example)
            else:
                print(f"  No nested t() calls found")
            
            print()
        else:
            print(f"[{i}/{total_files}] File not found: {filename}")
            print()
    
    print("=" * 70)
    print(f"SUMMARY:")
    print(f"  Files checked: {total_files}")
    print(f"  Files with nested t() calls: {files_with_nested}")
    print(f"  Files without nested t() calls: {total_files - files_with_nested}")
    print(f"  Total nested t() calls found: {total_nested_calls}")
    print("=" * 70)

if __name__ == "__main__":
    main()