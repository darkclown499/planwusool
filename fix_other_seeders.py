#!/usr/bin/env python3
"""Fix remaining storage/media paths in CategorySeeder and StoreSeeder"""

import re
import random

CATEGORY_IMAGES = {
    'Mobile Accessories': 'phone-case,mobile-accessories',
    'Audio Devices': 'headphones,earphones',
    'Wearable Tech': 'smartwatch,fitness-tracker',
    'Power & Charging': 'power-bank,charger',
    'Computer Accessories': 'mouse,keyboard,laptop',
    "Men's Fashion": "mens-clothing,mens-shirt",
    "Women's Fashion": "womens-dress,womens-fashion",
    "Kid's Fashion": "kids-clothing,baby-clothes",
    'Footwear': "shoes,sneakers",
    'Accessories': "jewelry,bags,watch",
    'Home & Living': "home-decor,furniture",
    'Kitchen & Dining': "kitchen,cookware",
    'Beauty & Personal Care': "beauty,skincare,makeup",
    'Health & Wellness': "health,wellness,vitamins",
    'Sports & Outdoors': "sports,fitness,outdoor",
    'Automotive': "car,automotive",
    'Pet Supplies': "pet,dog,cat",
    'Books & Stationery': "books,stationery",
    'Toys & Games': "toys,games",
    'Grocery & Food': "food,grocery",
    'Jewelry & Accessories': "jewelry,necklace,ring",
    'Electronics': "electronics,gadgets",
    'default': "product,commerce",
}

def get_unsplash_url(category, idx):
    terms = CATEGORY_IMAGES.get(category, CATEGORY_IMAGES['default'])
    seed = f"{hash(category + str(idx)) % 1000000:06d}"
    return f"https://images.unsplash.com/photo-{seed}?w=800&h=800&fit=crop&crop=center"

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Track current category
    current_category = 'default'
    counter = 0
    
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        # Detect category from array key
        cat_match = re.search(r"'([^']+)'\s*=>\s*\[", line)
        if cat_match:
            potential_cat = cat_match.group(1)
            for cat_key in CATEGORY_IMAGES.keys():
                if cat_key != 'default' and (cat_key in potential_cat or potential_cat in cat_key):
                    current_category = cat_key
                    break
            else:
                current_category = 'default'
        
        # Replace storage/media paths
        def replace_path(match):
            nonlocal counter
            counter += 1
            return get_unsplash_url(current_category, counter)
        
        line = re.sub(r'/storage/media/\d+/collection\.png', 
                     lambda m: replace_path(m), line)
        
        new_lines.append(line)
    
    with open(filepath, 'w') as f:
        f.write('\n'.join(new_lines))
    
    print(f"Fixed {filepath}: {counter} images replaced")

if __name__ == '__main__':
    fix_file('database/seeders/CategorySeeder.php')
    fix_file('database/seeders/StoreSeeder.php')