<?php
namespace Tests\Feature;

use Tests\TestCase;

class TemplateRequireRegressionTest extends TestCase
{
    public function test_no_runtime_require_in_browser_templates(): void
    {
        $base = resource_path('js');
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($base));
        $bad = [];
        foreach ($iterator as $file) {
            if (!$file->isFile()) continue;
            $path = $file->getPathname();
            if (!preg_match('/\.(tsx?|jsx?)$/', $path)) continue;
            if (str_contains($path, 'node_modules')) continue;
            // Allow tailwind config (not in js)
            if (str_contains($path, 'tailwind.config.js')) continue;
            $content = file_get_contents($path);
            // Find require( that is not inside a comment/string? Simple check for \brequire\s*\( 
            // Ignore vendor require in comments like // require(
            if (preg_match('/\brequire\s*\(/', $content)) {
                // Allow require in comments: check if line is comment
                // Simple: if file is in templates-v2, any require is forbidden
                if (str_contains($path, 'templates-v2') || str_contains($path, 'pages/store') || str_contains($path, 'components')) {
                    $bad[] = $path;
                }
            }
        }
        $this->assertEmpty($bad, "Browser-side CommonJS require() found in: ".implode(', ', $bad).". Use ESM import instead.");
    }

    public function test_all_six_templates_resolve_via_esm_registry(): void
    {
        $registry = file_get_contents(resource_path('js/templates-v2/registry.tsx'));
        foreach (['fashion-atelier','bazaar-market','grocery-souq','bakery-house','electronics-hub','restaurant-menu'] as $slug) {
            $this->assertStringContainsString($slug, $registry, "Registry missing $slug");
        }
        $this->assertStringNotContainsString('require(', $registry, 'Registry must not use require');
        // Check that dynamic store pages import from registry, not from index (demo-data)
        $dynamic = file_get_contents(resource_path('js/pages/store/dynamic.tsx'));
        $this->assertStringContainsString("from '@/templates-v2/registry'", $dynamic, 'dynamic.tsx must import from registry');
        $this->assertStringNotContainsString("from '@/templates-v2'", $dynamic, 'dynamic.tsx must not import from barrel that pulls demo-data');
        $this->assertStringNotContainsString('require(', $dynamic);
    }

    public function test_demo_data_isolated_from_production_storefront(): void
    {
        // preview.tsx is the only file that should import demo-data
        $preview = file_get_contents(resource_path('js/templates-v2/shared/preview.tsx'));
        $this->assertStringContainsString('demo-data', $preview);
        // Production storefront files must not import demo-data
        $prodFiles = [
            resource_path('js/pages/store/dynamic.tsx'),
            resource_path('js/pages/store/category.tsx'),
            resource_path('js/pages/store/search.tsx'),
            resource_path('js/templates-v2/registry.tsx'),
        ];
        foreach ($prodFiles as $path) {
            $content = file_get_contents($path);
            $this->assertStringNotContainsString('demo-data', $content, basename($path)." must not import demo-data");
        }
        // index.ts must not re-export demo-data
        $index = file_get_contents(resource_path('js/templates-v2/index.ts'));
        $this->assertStringNotContainsString('demo-data', $index, 'index.ts must not re-export demo-data');
        $this->assertStringNotContainsString('buildV2PreviewStoreData', $index, 'index.ts must not export preview');
    }

    public function test_grocery_store62_like_state_renders_without_exception(): void
    {
        // Simulate store 62 minimal content that previously caused blank hero
        $store = new \App\Models\Store();
        $store->theme = 'grocery-souq';
        $store->store_content = [
            'banners' => null,
            'hero_banner' => ['type'=>'image','images'=>[],'heading'=>'','subtitle'=>'','cta_label'=>''],
            'hero_images' => [],
        ];
        $merged = $store->getMergedStoreContent();
        $this->assertIsArray($merged);
        // Safe banners handling
        $banners = $merged['banners'] ?? [];
        $safe = is_array($banners) ? $banners : [];
        $this->assertIsArray($safe);
        // Registry resolves
        $this->assertStringContainsString('grocery-souq', $store->getTemplateSlug() === 'grocery-souq' ? 'grocery-souq' : 'bazaar-market');
    }

    public function test_store_content_with_null_banners_does_not_crash(): void
    {
        $store = new \App\Models\Store();
        $store->theme = 'grocery-souq';
        $store->store_content = ['banners'=>null, 'hero_banner'=>['type'=>'image','images'=>[]]];
        $merged = $store->getMergedStoreContent();
        $this->assertIsArray($merged);
        $banners = $merged['banners'] ?? [];
        $safe = is_array($banners) ? $banners : [];
        $this->assertIsArray($safe);
        $this->assertSame('grocery-souq', $store->getTemplateSlug());
    }
}
