#!/usr/bin/env python3
"""Fix StoreSeeder favicon and logo images"""

import re

def fix_store_seeder():
    with open('database/seeders/StoreSeeder.php', 'r') as f:
        content = f.read()
    
    # Replace favicon and logo with simple placeholder images
    # Using simple colored squares for favicons and logos
    content = content.replace(
        "'favicon' => '/storage/media/1897/favicon.png'",
        "'favicon' => 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=32&h=32&fit=crop&crop=center'"
    )
    content = content.replace(
        "'logo' => '/storage/media/1896/header-logo.png'",
        "'logo' => 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=60&fit=crop&crop=center'"
    )
    content = content.replace(
        "'favicon' => '/storage/media/1899/favicon.png'",
        "'favicon' => 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=32&h=32&fit=crop&crop=center'"
    )
    content = content.replace(
        "'logo' => '/storage/media/1898/header-logo.png'",
        "'logo' => 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=60&fit=crop&crop=center'"
    )
    content = content.replace(
        "'favicon' => '/storage/media/1901/favicon.png'",
        "'favicon' => 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=32&h=32&fit=crop&crop=center'"
    )
    content = content.replace(
        "'logo' => '/storage/media/1900/header-logo.png'",
        "'logo' => 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=60&fit=crop&crop=center'"
    )
    content = content.replace(
        "'favicon' => '/storage/media/1903/favicon.png'",
        "'favicon' => 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=32&h=32&fit=crop&crop=center'"
    )
    content = content.replace(
        "'logo' => '/storage/media/1902/header-logo.png'",
        "'logo' => 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=200&h=60&fit=crop&crop=center'"
    )
    content = content.replace(
        "'favicon' => '/storage/media/1905/favicon.png'",
        "'favicon' => 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=32&h=32&fit=crop&crop=center'"
    )
    content = content.replace(
        "'logo' => '/storage/media/1904/header-logo.png'",
        "'logo' => 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=60&fit=crop&crop=center'"
    )
    content = content.replace(
        "'favicon' => '/storage/media/1907/favicon.png'",
        "'favicon' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=32&h=32&fit=crop&crop=center'"
    )
    content = content.replace(
        "'logo' => '/storage/media/1906/header-logo.png'",
        "'logo' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=60&fit=crop&crop=center'"
    )
    content = content.replace(
        "'favicon' => '/storage/media/1909/favicon.png'",
        "'favicon' => 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=32&h=32&fit=crop&crop=center'"
    )
    content = content.replace(
        "'logo' => '/storage/media/1908/header-logo.png'",
        "'logo' => 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&h=60&fit=crop&crop=center'"
    )
    
    with open('database/seeders/StoreSeeder.php', 'w') as f:
        f.write(content)
    
    print("Fixed StoreSeeder.php favicon and logo images")

if __name__ == '__main__':
    fix_store_seeder()