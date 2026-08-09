#!/usr/bin/env python3
"""
Replace placeholder /storage/media/ paths with real Unsplash URLs in ProductSeeder.php
"""

import re
import random

# Category to Unsplash search term mapping
CATEGORY_IMAGES = {
    'Mobile Accessories': {
        'cover': 'phone-case,phone-accessories,mobile-accessories',
        'gallery': 'phone-case,charger,cable,phone-stand,power-bank'
    },
    'Audio Devices': {
        'cover': 'headphones,earphones,earbuds,audio',
        'gallery': 'headphones,earbuds,speaker,microphone,audio-equipment'
    },
    'Wearable Tech': {
        'cover': 'smartwatch,fitness-tracker,wearable',
        'gallery': 'smartwatch,fitness-band,smart-ring,vr-headset'
    },
    'Power & Charging': {
        'cover': 'power-bank,charger,charging-cable',
        'gallery': 'power-bank,gan-charger,charging-station,cable,extension-board'
    },
    'Computer Accessories': {
        'cover': 'mouse,keyboard,laptop-accessories',
        'gallery': 'wireless-mouse,mechanical-keyboard,laptop-stand,cooling-pad,usb-hub,webcam,external-drive'
    },
    "Men's Fashion": {
        'cover': "mens-t-shirt,mens-shirt,jeans,trousers,jacket,hoodie,sneakers,watch",
        'gallery': "mens-clothing,mens-shoes,mens-watch,mens-accessories"
    },
    "Women's Fashion": {
        'cover': "womens-dress,womens-top,womens-fashion",
        'gallery': "womens-clothing,womens-shoes,womens-accessories,womens-bag"
    },
    'Kids & Baby': {
        'cover': 'kids-clothing,baby-clothes,toys',
        'gallery': 'kids-wear,baby-products,kids-toys,kids-shoes'
    },
    'Home & Living': {
        'cover': 'home-decor,furniture,home-accessories',
        'gallery': 'home-interior,decor,furniture,lighting,bedding,kitchen'
    },
    'Kitchen & Dining': {
        'cover': 'kitchen-appliances,cookware,dining',
        'gallery': 'kitchen-tools,appliances,cookware,utensils,dining-set'
    },
    'Beauty & Personal Care': {
        'cover': 'beauty-products,skincare,makeup',
        'gallery': 'skincare,makeup,hair-care,perfume,beauty-tools'
    },
    'Health & Wellness': {
        'cover': 'health-products,wellness,vitamins',
        'gallery': 'supplements,fitness-equipment,health-monitor,medical-device'
    },
    'Sports & Outdoors': {
        'cover': 'sports-equipment,outdoor-gear,fitness',
        'gallery': 'sports-gear,outdoor-equipment,camping,hiking,fitness-accessories'
    },
    'Automotive': {
        'cover': 'car-accessories,auto-parts',
        'gallery': 'car-accessories,car-charger,phone-mount,car-organizer,auto-tools'
    },
    'Pet Supplies': {
        'cover': 'pet-products,dog-cat-accessories',
        'gallery': 'pet-food,pet-toys,pet-accessories,dog-bed,cat-tree'
    },
    'Books & Stationery': {
        'cover': 'books,notebook,stationery',
        'gallery': 'books,notebooks,pens,planner,office-supplies'
    },
    'Toys & Games': {
        'cover': 'toys,games,kids-toys',
        'gallery': 'toys,board-games,educational-toys,action-figures,puzzles'
    },
    'Grocery & Food': {
        'cover': 'food-products,grocery,snacks',
        'gallery': 'food,beverages,snacks,organic-food,pantry-items'
    },
    'Jewelry & Accessories': {
        'cover': 'jewelry,accessories,watch',
        'gallery': 'jewelry,necklace,ring,bracelet,earrings,watch'
    },
    'Electronics': {
        'cover': 'electronics,gadgets,tech',
        'gallery': 'electronics,gadgets,smart-home,tech-accessories'
    },
    'default': {
        'cover': 'product,commerce,shopping',
        'gallery': 'product,package,commerce,retail'
    }
}

def get_unsplash_url(search_terms, width=800, height=800, seed=None):
    """Generate Unsplash URL with search terms"""
    if seed:
        return f"https://images.unsplash.com/photo-{seed}?w={width}&h={height}&fit=crop&crop=center"
    # Use source.unsplash.com with search terms
    terms = random.choice(search_terms.split(','))
    return f"https://source.unsplash.com/{width}x{height}/?{terms}"

def get_collection_url(category, idx):
    """Get a consistent collection image for a category"""
    terms = CATEGORY_IMAGES.get(category, CATEGORY_IMAGES['default'])['cover']
    # Use a deterministic seed based on category and index
    seed = f"{hash(category + str(idx)) % 1000000:06d}"
    return get_unsplash_url(terms, 800, 800, seed)

def get_gallery_url(category, product_idx, img_idx):
    """Get gallery image for a product"""
    terms = CATEGORY_IMAGES.get(category, CATEGORY_IMAGES['default'])['gallery']
    seed = f"{hash(category + str(product_idx) + str(img_idx)) % 1000000:06d}"
    return get_unsplash_url(terms, 800, 800, seed)

def replace_images_in_seeder():
    with open('database/seeders/ProductSeeder.php', 'r') as f:
        content = f.read()
    
    # Track category context
    current_category = 'default'
    product_counter = 0
    
    # Pattern to detect category sections
    category_pattern = r"'([^']+)'\s*=>\s*\["
    
    # First pass: find all category names and their positions
    categories_found = []
    for match in re.finditer(category_pattern, content):
        cat_name = match.group(1)
        if cat_name in CATEGORY_IMAGES or any(cat_name in k for k in CATEGORY_IMAGES.keys()):
            categories_found.append((match.start(), cat_name))
    
    # Replace collection images
    collection_counter = 0
    def replace_collection(match):
        nonlocal collection_counter
        path = match.group(0)
        category = current_category
        url = get_collection_url(category, collection_counter)
        collection_counter += 1
        return url
    
    # Replace gallery images (1.png, 2.png, etc.)
    gallery_counter = {}
    def replace_gallery(match):
        path = match.group(0)
        # Extract media number from path like /storage/media/123/1.png
        parts = path.split('/')
        if len(parts) >= 4:
            try:
                product_idx = int(parts[-2])
                img_idx = int(parts[-1].split('.')[0])
            except:
                product_idx = random.randint(1, 1000)
                img_idx = random.randint(1, 5)
        else:
            product_idx = random.randint(1, 1000)
            img_idx = random.randint(1, 5)
        
        url = get_gallery_url(current_category, product_idx, img_idx)
        return url
    
    # Process line by line to maintain category context
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        # Detect category change
        cat_match = re.search(r"'([^']+)'\s*=>\s*\[", line)
        if cat_match:
            potential_cat = cat_match.group(1)
            # Check if it's a known category
            for cat_key in CATEGORY_IMAGES.keys():
                if cat_key != 'default' and (cat_key in potential_cat or potential_cat in cat_key):
                    current_category = cat_key
                    break
            else:
                current_category = 'default'
        
        # Replace collection images
        line = re.sub(r'/storage/media/\d+/collection\.png', 
                     lambda m: replace_collection(m), line)
        
        # Replace gallery images (1.png, 2.png, etc. in images field)
        line = re.sub(r'/storage/media/\d+/\d+\.png', 
                     lambda m: replace_gallery(m), line)
        
        # Also replace in cover_image and images arrays
        line = re.sub(r"('cover_image'\s*=>\s*')/storage/media/[^']+(')", 
                     lambda m: f"{m.group(1)}{get_collection_url(current_category, random.randint(1,1000))}{m.group(2)}", line)
        
        new_lines.append(line)
    
    new_content = '\n'.join(new_lines)
    
    # Write back
    with open('database/seeders/ProductSeeder.php', 'w') as f:
        f.write(new_content)
    
    print(f"Replaced images in ProductSeeder.php")
    print(f"Category context: {current_category}")
    print(f"Collections replaced: {collection_counter}")

if __name__ == '__main__':
    replace_images_in_seeder()