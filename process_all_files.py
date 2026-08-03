import re
import os

def is_arabic(text):
    """Check if text contains Arabic characters (Unicode U+0600 to U+06FF)"""
    arabic_pattern = re.compile(r'[\u0600-\u06FF]')
    return bool(arabic_pattern.search(text))

def is_already_wrapped(text):
    """Check if text is already wrapped with t() without nested t() calls"""
    text = text.strip()
    # Check if it's wrapped with t() at the top level (not nested)
    if text.startswith('t(') and text.endswith(')'):
        # Check if there's no nested t() calls
        inner_content = text[2:-1].strip()
        # Look for t( but not the opening one
        if 't(' in inner_content and inner_content.count('t(') > 1:
            return False
        return True
    return False

def unwrap_nested_t_calls(content):
    """Fix nested t() calls in content by replacing t('t('...')') with t('...')"""
    
    # Pattern to match nested t() calls like t('t('string')') or t(t('string'))
    # This regex matches patterns where t() contains another t() call
    nested_pattern = r"t\s*\(\s*t\s*\(['\"]([^'\"]+)['\"]\)\s*\)"
    
    def replace_match(match):
        # Extract the inner string from the nested call
        inner_string = match.group(1)
        # Return the unwrapped t() call
        return f"t('{inner_string}')"
    
    # Apply the fix repeatedly until no more matches
    new_content = re.sub(nested_pattern, replace_match, content)
    
    # Also handle double quotes version
    nested_pattern_double = r't\s*\(\s*t\s*\("([^\"]+)"\)\s*\)'
    
    def replace_match_double(match):
        inner_string = match.group(1)
        return f't("{inner_string}")'
    
    new_content = re.sub(nested_pattern_double, replace_match_double, new_content)
    
    return new_content

def extract_string_literals(content):
    """Extract string literals from content, handling quotes properly"""
    strings = []
    i = 0
    while i < len(content):
        char = content[i]
        
        # Find start of string literal
        if char in ['"', "'"]:
            quote = char
            start = i
            i += 1
            
            # Find end of string literal
            while i < len(content):
                char = content[i]
                
                # Handle escaped quotes
                if char == '\\\\' and i + 1 < len(content):
                    i += 2  # Skip escape and escaped char
                    continue
                
                # Handle end of string
                if char == quote:
                    end = i
                    string_literal = content[start:end + 1]
                    strings.append(string_literal)
                    i += 1
                    break
                
                i += 1
        else:
            i += 1
    
    return strings

def wrap_arabic_strings_in_content(content):
    """Find and wrap Arabic strings with t() function"""
    
    # First, unwrap any nested t() calls
    content = unwrap_nested_t_calls(content)
    
    # Find all string literals using a more robust approach
    string_literals = extract_string_literals(content)
    
    # Build the result by processing all string literals
    result_parts = []
    last_pos = 0
    
    for string_literal in string_literals:
        # Find the position of this string literal in the content
        pos = content.find(string_literal, last_pos)
        if pos == -1:
            continue
        
        # Add text before this string
        result_parts.append(content[last_pos:pos])
        
        # Process the string literal
        if string_literal.startswith('"') and string_literal.endswith('"'):
            quote_char = '"'
            inner_content = string_literal[1:-1]
        elif string_literal.startswith("'") and string_literal.endswith("'"):
            quote_char = "'"
            inner_content = string_literal[1:-1]
        else:
            # Template literal or other, skip
            result_parts.append(string_literal)
            last_pos = pos + len(string_literal)
            continue
        
        # Check if inner content is Arabic
        if is_arabic(inner_content):
            # Check if already wrapped
            if is_already_wrapped(inner_content):
                result_parts.append(string_literal)
            else:
                # Determine quote for t()
                if "'" in inner_content:
                    t_quote = '"'
                else:
                    t_quote = "'"
                
                # Wrap with t()
                wrapped = f"t({t_quote}{inner_content}{t_quote})"
                
                # Replace the string literal
                if quote_char == "'":
                    result_parts.append(f"'{wrapped}'")
                else:
                    result_parts.append(f'"{wrapped}"')
        else:
            # Not Arabic, keep as-is
            result_parts.append(string_literal)
        
        last_pos = pos + len(string_literal)
    
    # Add remaining text
    result_parts.append(content[last_pos:])
    
    return ''.join(result_parts)

def process_file(file_path):
    """Process a single file"""
    print(f"  Processing: {os.path.basename(file_path)}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = wrap_arabic_strings_in_content(content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            # Count changes
            old_lines = content.split('\n')
            new_lines = new_content.split('\n')
            changes = sum(1 for i in range(min(len(old_lines), len(new_lines))) if old_lines[i] != new_lines[i])
            
            print(f"    Fixed {changes} nested t() calls and wrapped Arabic strings with t()")
            return True
        else:
            print(f"    No changes needed")
            return False
            
    except Exception as e:
        print(f"    Error processing {os.path.basename(file_path)}: {e}")
        return False

def main():
    # Directory containing the masalah-kit files
    base_dir = "C:\\Users\\eyadf\\Downloads\\Compressed\\codecanyon-fEPq3YRg-whatsstore-saas-online-whatsapp-store-builder\\wusool - moded1\\resources\\js\\themes\\masalah-kit"
    
    print("=" * 70)
    print("Processing Arabic strings and fixing nested t() calls in masalah-kit")
    print("=" * 70)
    print()
    
    # Files to process (8 files mentioned in the task)
    files_to_process = [
        os.path.join(base_dir, 'MasalahThemeProvider.tsx'),
        os.path.join(base_dir, 'MasalahStore.tsx'),
        os.path.join(base_dir, 'components', 'Footer.tsx'),
        os.path.join(base_dir, 'components', 'Header.tsx'),
        os.path.join(base_dir, 'components', 'HeroSlider.tsx'),
        os.path.join(base_dir, 'components', 'ProductCard.tsx'),
        os.path.join(base_dir, 'components', 'ProductDetail.tsx'),
        os.path.join(base_dir, 'components', 'Sidebar.tsx'),
    ]
    
    total_files = len(files_to_process)
    files_processed = 0
    files_fixed = 0
    
    for i, file_path in enumerate(files_to_process, 1):
        print(f"[{i}/{total_files}] Processing: {os.path.basename(file_path)}")
        
        if os.path.exists(file_path):
            changes_made = process_file(file_path)
            if changes_made:
                files_fixed += 1
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