import re
import os

def fix_nested_t_calls(content):
    """Fix nested t() calls like t('t('string')') to t('string')"""
    
    # Pattern 1: t('t('string')') - single quotes nested
    pattern1 = r"t\s*\(\s*t\s*\(['\"]([^'\"]+)['\"]\)\s*\)"
    
    def replace_pattern1(match):
        inner_string = match.group(1)
        return f"t('{inner_string}')"
    
    # Apply pattern 1
    new_content = re.sub(pattern1, replace_pattern1, content)
    
    # Pattern 2: t('t("..."') - double quotes nested
    pattern2 = r't\s*\(\s*t\s*\("([^\"]+)"\)\s*\)'
    
    def replace_pattern2(match):
        inner_string = match.group(1)
        return f't("{inner_string}")'
    
    # Apply pattern 2
    new_content = re.sub(pattern2, replace_pattern2, new_content)
    
    return new_content

def fix_file(file_path):
    """Fix nested t() calls in a file"""
    print(f"  Processing: {os.path.basename(file_path)}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Count nested t() calls before
    before_count = len(re.findall(r"t\s*\(\s*t\s*\(['\"](?:[^'\\\"]|\\\\.)*['\\\"]\)\s*\)", content))
    
    # Apply fixes
    new_content = fix_nested_t_calls(content)
    
    # Count nested t() calls after
    after_count = len(re.findall(r"t\s*\(\s*t\s*\(['\"](?:[^'\\\"]|\\\\.)*['\\\"]\)\s*\)", new_content))
    
    changes = before_count - after_count
    
    if changes > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"    Fixed {changes} nested t() calls")
        return True
    else:
        print(f"    No changes needed (found {before_count} nested t() calls)")
        return False

def main():
    # Files to process
    files_to_process = [
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
    
    print("=" * 70)
    print("Fixing Nested t() Calls in Masalah Kit Files")
    print("=" * 70)
    print()
    
    total_files = len(files_to_process)
    files_fixed = 0
    total_changes = 0
    
    for i, (filename, subpath) in enumerate(files_to_process, 1):
        file_path = os.path.join(base_path, subpath, filename)
        print(f"[{i}/{total_files}] Processing: {filename}")
        
        if os.path.exists(file_path):
            changes_made = fix_file(file_path)
            if changes_made:
                files_fixed += 1
                total_changes += changes_made
        else:
            print(f"    File not found!")
        
        print()
    
    print("=" * 70)
    print(f"SUMMARY:")
    print(f"  Files processed: {total_files}")
    print(f"  Files fixed: {files_fixed}")
    print(f"  Files unchanged: {total_files - files_fixed}")
    print(f"  Total changes: {total_changes}")
    print("=" * 70)

if __name__ == "__main__":
    main()