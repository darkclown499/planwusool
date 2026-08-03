import re
import os

def fix_nested_t_calls_in_content(content):
    """Fix nested t() calls by replacing t('t('...')') with t('...')"""
    
    # Pattern 1: t('t('string')') - single quotes nested
    pattern1 = r"t\s*\(\s*t\s*\(['\"]([^'\"]+)['\"]\)\s*\)"
    
    def replace_pattern1(match):
        inner_string = match.group(1)
        return f"t('{inner_string}')"
    
    # Apply pattern 1 repeatedly until no more matches
    new_content = re.sub(pattern1, replace_pattern1, content)
    
    # Pattern 2: Handle more complex nested cases with escaped quotes
    # This is a more robust approach that handles various nested patterns
    def fix_nested(match):
        full_match = match.group(0)
        
        # Remove the outer t( and )
        # For patterns like t('t('...')') or t("t('...')") or t(t('...'))
        # We need to extract the inner string and wrap it with t()
        
        # Try to find the inner t() call
        inner_match = re.search(r"t\s*\(['\"]([^'\"]+)['\"]\)", full_match)
        if inner_match:
            inner_string = inner_match.group(1)
            # Return the unwrapped t() call
            return f"t('{inner_string}')"
        
        return full_match
    
    # Apply pattern 2
    new_content = re.sub(pattern1, fix_nested, new_content)
    
    return new_content

def process_file(file_path):
    """Process a single file to fix nested t() calls"""
    print(f"  Processing: {os.path.basename(file_path)}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = fix_nested_t_calls_in_content(content)
    
    if new_content != content:
        # Count changes by comparing lines
        old_lines = content.split('\n')
        new_lines = new_content.split('\n')
        
        changes = 0
        for i in range(min(len(old_lines), len(new_lines))):
            if old_lines[i] != new_lines[i]:
                changes += 1
                # Print the change
                if changes <= 3:
                    print(f"    Fixed: {new_lines[i].strip()}")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"    Total fixes: {changes}")
        return True
    else:
        print(f"    No changes needed")
        return False

def main():
    # Files to process (all 8 files mentioned in the task)
    files_to_process = [
        'C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\MasalahThemeProvider.tsx',
        'C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\MasalahStore.tsx',
        'C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\components\\Footer.tsx',
        'C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\components\\Header.tsx',
        'C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\components\\HeroSlider.tsx',
        'C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\components\\ProductCard.tsx',
        'C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\components\\ProductDetail.tsx',
        'C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit\\components\\Sidebar.tsx',
    ]
    
    print("=" * 70)
    print("Fixing Nested t() Calls in Masalah Kit Files")
    print("=" * 70)
    print()
    
    total_files = len(files_to_process)
    files_fixed = 0
    total_changes = 0
    
    for i, file_path in enumerate(files_to_process, 1):
        print(f"[{i}/{total_files}] Processing: {os.path.basename(file_path)}")
        
        if os.path.exists(file_path):
            changes_made = process_file(file_path)
            if changes_made:
                files_fixed += 1
        else:
            print(f"  File not found!")
        
        print()
    
    print("=" * 70)
    print(f"SUMMARY:")
    print(f"  Files processed: {total_files}")
    print(f"  Files fixed: {files_fixed}")
    print(f"  Files unchanged: {total_files - files_fixed}")
    print("=" * 70)

if __name__ == "__main__":
    main()