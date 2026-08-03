import re
import os

def is_arabic(text):
    """Check if text contains Arabic characters (Unicode U+0600 to U+06FF)"""
    arabic_pattern = re.compile(r'[\u0600-\u06FF]')
    return bool(arabic_pattern.search(text))

def check_and_fix_files():
    # Directory containing the masalah-kit files
    base_dir = "C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit"
    
    print("=" * 70)
    print("Checking and fixing Arabic strings in masalah-kit files")
    print("=" * 70)
    print()
    
    # Files to process (8 files mentioned in the task)
    files_to_process = [
        ('MasalahThemeProvider.tsx', 'resources/js/themes/masalah-kit'),
        ('MasalahStore.tsx', 'resources/js/themes/masalah-kit'),
        ('components/Footer.tsx', 'resources/js/themes/masalah-kit'),
        ('components/Header.tsx', 'resources/js/themes/masalah-kit'),
        ('components/HeroSlider.tsx', 'resources/js/themes/masalah-kit'),
        ('components/ProductCard.tsx', 'resources/js/themes/masalah-kit'),
        ('components/ProductDetail.tsx', 'resources/js/themes/masalah-kit'),
        ('components/Sidebar.tsx', 'resources/js/themes/masalah-kit'),
    ]
    
    total_files = len(files_to_process)
    files_processed = 0
    files_fixed = 0
    
    for i, (filename, subpath) in enumerate(files_to_process, 1):
        file_path = os.path.join(base_dir, subpath, filename)
        print(f"[{i}/{total_files}] Processing: {filename}")
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for useStorefrontLocale import
            has_import = 'useStorefrontLocale' in content
            
            # Find all string literals that are Arabic but not wrapped with t()
            # Pattern to match string literals
            string_pattern = r"(['\"])([^'\"]*)\1"
            
            changes_made = False
            change_count = 0
            
            def replace_match(match):
                nonlocal changes_made, change_count
                quote_char = match.group(1)
                string_content = match.group(2)
                
                # Skip if already wrapped with t()
                if string_content.strip().startswith('t(') and string_content.strip().endswith(')'):
                    return match.group(0)
                
                # Check if the string content is Arabic
                if is_arabic(string_content):
                    # Skip if it's in a JavaScript expression like `...` or template literals
                    if string_content.startswith('${') or '${' in string_content:
                        return match.group(0)
                    
                    # Determine quote for t()
                    if "'" in string_content:
                        t_quote = '"'
                    else:
                        t_quote = "'"
                    
                    # Wrap with t()
                    wrapped = f"t({t_quote}{string_content}{t_quote})"
                    
                    # Count the change
                    change_count += 1
                    changes_made = True
                    
                    # Return the wrapped string
                    if quote_char == "'":
                        return f"'{wrapped}'"
                    else:
                        return f'"{wrapped}"'
                
                return match.group(0)
            
            # Apply replacements
            new_content = re.sub(string_pattern, replace_match, content)
            
            if changes_made:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                print(f"    Fixed {change_count} Arabic strings (wrapped with t())")
                files_fixed += 1
            else:
                print(f"    No changes needed (Arabic strings already wrapped)")
            
            files_processed += 1
        else:
            print(f"  File not found!")
            files_processed += 1
        
        print()
    
    print("=" * 70)
    print(f"SUMMARY:")
    print(f"  Files processed: {files_processed}")
    print(f"  Files fixed: {files_fixed}")
    print(f"  Files unchanged: {total_files - files_fixed}")
    print("=" * 70)

if __name__ == "__main__":
    main()