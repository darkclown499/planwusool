import re, os, sys

sys.stdout.reconfigure(encoding='utf-8')

gadgets_dir = 'resources/js/themes/gadgets-store'
output_lines = []

for f in sorted(os.listdir(gadgets_dir)):
    if f.endswith('.tsx'):
        path = os.path.join(gadgets_dir, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        if re.search(r'[\u0600-\u06FF]', content):
            output_lines.append(f'=== {f} ===')
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                if re.search(r'[\u0600-\u06FF]', line):
                    output_lines.append(f'  Line {i}: {line.strip()[:120]}')
            output_lines.append('')

with open('gadgets_check.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(output_lines))

print(f'Wrote {len(output_lines)} lines to gadgets_check.txt')