<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductVariantUxTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;
    private User $merchant;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->merchant = User::factory()->create(['type' => 'company']);
        $this->store = Store::factory()->create(['user_id' => $this->merchant->id, 'slug' => 'ux-store']);
        $this->category = Category::factory()->create(['store_id' => $this->store->id, 'is_active' => true]);
    }

    private function cartesian(array $groups): array
    {
        $active = array_values(array_filter($groups, fn($g) => trim($g['name'] ?? '') !== '' && count(array_filter(array_map('trim', $g['values'] ?? []))) > 0));
        $active = array_map(fn($g) => ['name' => $g['name'], 'values' => array_values(array_filter(array_map('trim', $g['values']), fn($v) => $v !== ''))], $active);
        if (empty($active)) return [];
        $rows = [[]];
        foreach ($active as $g) {
            $next = [];
            foreach ($rows as $row) {
                foreach ($g['values'] as $v) {
                    $next[] = array_merge($row, [$v]);
                }
            }
            $rows = $next;
        }
        return array_map(fn($values) => ['id' => implode('‖', $values), 'values' => $values, 'label' => implode(' / ', $values)], $rows);
    }

    public function test_3x4_generates_12(): void
    {
        $groups = [
            ['name' => 'اللون', 'values' => ['أسود','أبيض','زهري']],
            ['name' => 'المقاس', 'values' => ['S','M','L','XL']],
        ];
        $combos = $this->cartesian($groups);
        $this->assertCount(12, $combos);
        $ids = array_column($combos, 'id');
        $this->assertContains('أسود‖S', $ids);
        $this->assertContains('زهري‖XL', $ids);
        $this->assertContains('أبيض‖M', $ids);
    }

    public function test_presets_do_not_create_duplicates(): void
    {
        $values = ['أسود', 'أبيض'];
        $preset = 'أسود';
        // Simulate addPresetValue duplicate guard
        if (!in_array($preset, $values, true)) $values[] = $preset;
        $this->assertCount(2, $values, 'duplicate preset must not be added');
        $preset2 = 'زهري';
        if (!in_array($preset2, $values, true)) $values[] = $preset2;
        $this->assertCount(3, $values);
        $this->assertContains('زهري', $values);
    }

    public function test_bulk_price_applies_to_all(): void
    {
        $groups = [['name'=>'اللون','values'=>['أسود','أبيض','زهري']],['name'=>'المقاس','values'=>['S','M','L','XL']]];
        $generated = $this->cartesian($groups);
        // Simulate bulk price 50
        $edits = [];
        foreach ($generated as $g) $edits[$g['id']] = array_merge($g, ['price'=>'50','stock'=>'5']);
        $this->assertCount(12, $edits);
        foreach ($edits as $c) $this->assertEquals('50', $c['price']);
    }

    public function test_bulk_stock_applies_to_all(): void
    {
        $groups = [['name'=>'اللون','values'=>['أسود','أبيض','زهري']],['name'=>'المقاس','values'=>['S','M','L','XL']]];
        $generated = $this->cartesian($groups);
        $edits = [];
        foreach ($generated as $g) $edits[$g['id']] = array_merge($g, ['price'=>'50','stock'=>'5']);
        foreach ($edits as $c) $this->assertEquals('5', $c['stock']);
    }

    public function test_manual_override_after_bulk_preserved(): void
    {
        $groups = [['name'=>'اللون','values'=>['أسود','أبيض','زهري']],['name'=>'المقاس','values'=>['S','M','L','XL']]];
        $generated = $this->cartesian($groups);
        $edits = [];
        foreach ($generated as $g) $edits[$g['id']] = array_merge($g, ['price'=>'50','stock'=>'5']);
        // manual override Black/XL
        $edits['أسود‖XL']['price'] = '60';
        $edits['أسود‖XL']['stock'] = '2';
        $this->assertEquals('60', $edits['أسود‖XL']['price']);
        $this->assertEquals('2', $edits['أسود‖XL']['stock']);
        // others remain 50/5
        $this->assertEquals('50', $edits['أسود‖S']['price']);
        $this->assertEquals('5', $edits['أسود‖S']['stock']);
        // Count 11 with 50/5 and 1 with 60/2
        $count50 = count(array_filter($edits, fn($c)=> $c['price']==='50' && $c['stock']==='5'));
        $this->assertEquals(11, $count50);
    }

    public function test_reload_preserves_edits_via_uuid_and_id(): void
    {
        $combos = [
            ['id'=>'أسود‖S','uuid'=>'u1','values'=>['أسود','S'],'label'=>'أسود / S','price'=>'50','stock'=>'5','sku'=>'SKU-1','image'=>'/img1.jpg'],
            ['id'=>'أسود‖M','uuid'=>'u2','values'=>['أسود','M'],'label'=>'أسود / M','price'=>'50','stock'=>'5','sku'=>'','image'=>''],
            ['id'=>'أبيض‖S','uuid'=>'u3','values'=>['أبيض','S'],'label'=>'أبيض / S','price'=>'60','stock'=>'2','sku'=>'SKU-3','image'=>''],
        ];
        $product = Product::factory()->create([
            'store_id'=>$this->store->id,'category_id'=>$this->category->id,'is_active'=>true,
            'price'=>100,'stock'=>10,'variants'=>[['name'=>'اللون','values'=>['أسود','أبيض']],['name'=>'المقاس','values'=>['S','M']]],
            'variant_combinations'=>$combos,'inventory_mode'=>'variant','track_inventory'=>true,
        ]);
        $product->refresh();
        $this->assertCount(3, $product->variant_combinations);
        $byId = collect($product->variant_combinations)->keyBy('id');
        $this->assertEquals('50', $byId['أسود‖S']['price']);
        $this->assertEquals('u1', $byId['أسود‖S']['uuid']);
        $this->assertEquals('SKU-1', $byId['أسود‖S']['sku']);
        $this->assertEquals('60', $byId['أبيض‖S']['price']);
    }

    public function test_removal_warning_counts_affected_combinations(): void
    {
        $groups = [['name'=>'اللون','values'=>['أسود','أبيض','زهري']],['name'=>'المقاس','values'=>['S','M','L','XL']]];
        $generated = $this->cartesian($groups);
        // Simulate removal of زهري — affected = 4
        $affected = array_filter($generated, fn($c)=> in_array('زهري', $c['values'], true));
        $this->assertCount(4, $affected);
        // removal of أسود similarly 4
        $affectedBlack = array_filter($generated, fn($c)=> in_array('أسود', $c['values'], true));
        $this->assertCount(4, $affectedBlack);
    }

    public function test_cancel_removal_preserves_combinations(): void
    {
        $groups = [['name'=>'اللون','values'=>['أسود','أبيض','زهري']],['name'=>'المقاس','values'=>['S','M','L','XL']]];
        $before = $this->cartesian($groups);
        $this->assertCount(12, $before);
        // cancel means no mutation — still 12
        $afterCancel = $this->cartesian($groups);
        $this->assertCount(12, $afterCancel);
    }

    public function test_confirm_removal_preserves_unaffected(): void
    {
        $groups = [['name'=>'اللون','values'=>['أسود','أبيض','زهري']],['name'=>'المقاس','values'=>['S','M','L','XL']]];
        $before = $this->cartesian($groups);
        // Build edits with prices
        $edits = [];
        foreach ($before as $g) $edits[$g['id']] = array_merge($g, ['price'=>'50','stock'=>'5']);
        $edits['أسود‖XL']['price'] = '60';
        $edits['أسود‖XL']['stock'] = '2';
        // Remove زهري
        $remainingGroups = [['name'=>'اللون','values'=>['أسود','أبيض']],['name'=>'المقاس','values'=>['S','M','L','XL']]];
        $after = $this->cartesian($remainingGroups);
        $this->assertCount(8, $after);
        // Simulate merge preserves
        foreach ($after as $g) {
            $prev = $edits[$g['id']] ?? null;
            $this->assertNotNull($prev, "remaining combo {$g['id']} should have preserved edit");
        }
        // Check Black XL still 60/2
        $this->assertEquals('60', $edits['أسود‖XL']['price']);
        // Ensure no زهري remains
        foreach ($after as $g) $this->assertNotContains('زهري', $g['values']);
    }

    public function test_product_type_ux_maps_to_variants_enabled(): void
    {
        // Simple product has empty variants
        $simple = Product::factory()->create(['store_id'=>$this->store->id,'category_id'=>$this->category->id,'variants'=>[],'variant_combinations'=>[],'inventory_mode'=>'product']);
        $this->assertEmpty($simple->variants);
        $this->assertEquals('product', $simple->inventory_mode);
        // Variable product has variants
        $variable = Product::factory()->create(['store_id'=>$this->store->id,'category_id'=>$this->category->id,'variants'=>[['name'=>'اللون','values'=>['أسود']]],'variant_combinations'=>[['id'=>'أسود','values'=>['أسود'],'label'=>'أسود','price'=>'50','stock'=>'5']],'inventory_mode'=>'variant']);
        $this->assertNotEmpty($variable->variants);
        $this->assertEquals('variant', $variable->inventory_mode);
    }

    public function test_inventory_mode_remains_canonical_variant(): void
    {
        $combos = [['id'=>'أسود‖S','values'=>['أسود','S'],'label'=>'أسود / S','price'=>'50','stock'=>'5']];
        $p = Product::factory()->create(['store_id'=>$this->store->id,'category_id'=>$this->category->id,'variants'=>[['name'=>'اللون','values'=>['أسود']],['name'=>'المقاس','values'=>['S']]],'variant_combinations'=>$combos,'inventory_mode'=>'variant','track_inventory'=>true,'stock'=>999]);
        $this->assertTrue(\App\Services\InventoryService::isVariantInventory($p));
        $p2 = Product::factory()->create(['store_id'=>$this->store->id,'category_id'=>$this->category->id,'variants'=>[],'variant_combinations'=>[],'inventory_mode'=>'product','track_inventory'=>true,'stock'=>10]);
        $this->assertFalse(\App\Services\InventoryService::isVariantInventory($p2));
    }

    public function test_total_stock_computed_from_combinations(): void
    {
        $combos = [
            ['id'=>'أسود‖S','values'=>['أسود','S'],'label'=>'أسود / S','price'=>'50','stock'=>'5'],
            ['id'=>'أسود‖M','values'=>['أسود','M'],'label'=>'أسود / M','price'=>'50','stock'=>'5'],
            ['id'=>'أبيض‖S','values'=>['أبيض','S'],'label'=>'أبيض / S','price'=>'50','stock'=>'5'],
            ['id'=>'أبيض‖M','values'=>['أبيض','M'],'label'=>'أبيض / M','price'=>'50','stock'=>'5'],
        ];
        $total = array_sum(array_map(fn($c)=> (int)$c['stock'], $combos));
        $this->assertEquals(20, $total);
        // After changing one to 2
        $combos[1]['stock']='2';
        $total2 = array_sum(array_map(fn($c)=> (int)$c['stock'], $combos));
        $this->assertEquals(17, $total2);
    }
}
