import re

# Read the file to see current state
with open('resources/js/themes/masalah-kit/components/Footer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find nested t() calls - pattern: t(t('text'))
nested_pattern = r"t\(t\(['\"](.*?)['\"]\)\)"

print('=== Nested t() calls found ===')
matches = re.finditer(nested_pattern, content)
for match in matches:
    print(f'Found: {match.group(0)}')
    print(f'Inner: {match.group(1)}')
    print()

# Also check for t( variables ) patterns
t_var_pattern = r"t\(['\"](\w+)['\"]\)"
print('=== t() with words (potential UI text) ===')
matches = re.finditer(t_var_pattern, content)
for match in matches:
    print(f'Found: {match.group(0)}')