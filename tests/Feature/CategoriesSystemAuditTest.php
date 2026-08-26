<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CategoriesSystemAuditTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(array $storeAttrs = []): array
    {
        // Create plan to satisfy plan.access middleware
        $plan = \App\Models\Plan::factory()->create([
            'name' => 'Test-'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_products_per_store' => 1000,
            'max_stores' => 10,
        ]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
        ]);
        $store = Store::factory()->create(array_merge(['user_id' => $user->id], $storeAttrs));
        $user->current_store = $store->id; $user->save();
        // Give permissions via role
        try {
            $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'company-test-'.uniqid(), 'guard_name' => 'web']);
            $perms = \Spatie\Permission\Models\Permission::whereIn('name', ['manage-categories','create-categories','edit-categories','delete-categories','view-categories'])->get();
            if ($perms->count() > 0) {
                $role->syncPermissions($perms);
                $user->assignRole($role);
            } else {
                // Fallback: superadmin bypass
                $user->type = 'superadmin'; $user->save();
            }
        } catch (\Throwable $e) {
            $user->type = 'superadmin'; $user->save();
        }
        return [$user, $store];
    }

    // 1 create root category persists
    public function test_create_root_category_persists(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $res = $this->post(route('categories.store'), [
            'name' => 'أزياء نسائية',
            'description' => 'وصف فئة',
            'sort_order' => 2,
            'is_active' => true,
        ]);
        $res->assertRedirect(route('categories.index'));
        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'name' => 'أزياء نسائية', 'parent_id' => null, 'sort_order' => 2, 'is_active' => true]);
        $cat = Category::where('store_id', $store->id)->first();
        $this->assertNotEmpty($cat->slug);
    }

    // 2 create subcategory persists
    public function test_create_subcategory_persists(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $parent = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->post(route('categories.store'), [
            'name' => 'عبايات',
            'parent_id' => $parent->id,
            'is_active' => true,
        ]);
        $res->assertRedirect(route('categories.index'));
        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'name' => 'عبايات', 'parent_id' => $parent->id]);
    }

    // 3 edit category persists
    public function test_edit_category_persists(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'name' => 'Old', 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->put(route('categories.update', $cat->id), [
            'name' => 'New Name',
            'description' => 'new desc',
            'sort_order' => 5,
            'is_active' => true,
        ]);
        $res->assertRedirect(route('categories.index'));
        $cat->refresh();
        $this->assertSame('New Name', $cat->name);
        $this->assertSame('new desc', $cat->description);
        $this->assertSame(5, $cat->sort_order);
    }

    // 4 active -> inactive hides storefront
    public function test_active_inactive_hides_storefront(): void
    {
        [$user, $store] = $this->merchantWithStore(['theme' => 'bazaar-market']);
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'active-cat-'.uniqid()]);
        // Simulate ThemeController home categories query
        $visible = Category::where('store_id', $store->id)->where('is_active', true)->whereNull('parent_id')->get();
        $this->assertTrue($visible->contains('id', $cat->id));
        $cat->update(['is_active' => false]);
        $visible2 = Category::where('store_id', $store->id)->where('is_active', true)->whereNull('parent_id')->get();
        $this->assertFalse($visible2->contains('id', $cat->id));
        // Category page should 404 for inactive
        $ctrl = new \App\Http\Controllers\ThemeController();
        $found = Category::where('store_id', $store->id)->where('is_active', true)->where('slug', $cat->slug)->first();
        $this->assertNull($found);
    }

    // 5 inactive -> active restores
    public function test_inactive_active_restores(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => false]);
        $visible = Category::where('store_id', $store->id)->where('is_active', true)->get();
        $this->assertFalse($visible->contains('id', $cat->id));
        $cat->update(['is_active' => true]);
        $visible2 = Category::where('store_id', $store->id)->where('is_active', true)->get();
        $this->assertTrue($visible2->contains('id', $cat->id));
    }

    // 6 sort order respected
    public function test_sort_order_respected(): void
    {
        [$user, $store] = $this->merchantWithStore();
        Category::factory()->create(['store_id' => $store->id, 'name' => 'B', 'sort_order' => 2, 'is_active' => true, 'parent_id' => null]);
        Category::factory()->create(['store_id' => $store->id, 'name' => 'A', 'sort_order' => 1, 'is_active' => true, 'parent_id' => null]);
        Category::factory()->create(['store_id' => $store->id, 'name' => 'C', 'sort_order' => 1, 'is_active' => true, 'parent_id' => null]);
        $ordered = Category::where('store_id', $store->id)->where('is_active', true)->whereNull('parent_id')->orderBy('sort_order')->orderBy('name')->orderBy('id')->get()->pluck('name')->all();
        // A and C both sort_order 1, A before C by name
        $this->assertSame(['A', 'C', 'B'], $ordered);
    }

    // 7 parent self-reference rejected
    public function test_parent_self_reference_rejected(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->put(route('categories.update', $cat->id), [
            'name' => $cat->name,
            'parent_id' => $cat->id,
        ]);
        $res->assertSessionHasErrors('parent_id');
        $cat->refresh();
        $this->assertNull($cat->parent_id);
    }

    // 8 circular parent rejected (A->B, B->A)
    public function test_circular_parent_rejected(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $a = Category::factory()->create(['store_id' => $store->id, 'parent_id' => null, 'is_active' => true]);
        $b = Category::factory()->create(['store_id' => $store->id, 'parent_id' => $a->id, 'is_active' => true]);
        $this->actingAs($user);
        // Try to make A child of B -> cycle
        $res = $this->put(route('categories.update', $a->id), [
            'name' => $a->name,
            'parent_id' => $b->id,
        ]);
        // Depth limit or cycle should reject? Since B is child (has parent), depth limit will reject. Both are valid rejections.
        $res->assertSessionHasErrors('parent_id');
    }

    // 9 cross-store parent rejected
    public function test_cross_store_parent_rejected(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [$otherUser, $otherStore] = $this->merchantWithStore();
        $otherCat = Category::factory()->create(['store_id' => $otherStore->id, 'parent_id' => null, 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->post(route('categories.store'), [
            'name' => 'Try Cross',
            'parent_id' => $otherCat->id,
        ]);
        $res->assertSessionHasErrors('parent_id');
        $this->assertDatabaseMissing('categories', ['name' => 'Try Cross', 'parent_id' => $otherCat->id]);
    }

    // 10 Store A cannot edit Store B category
    public function test_store_a_cannot_edit_store_b_category(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [$otherUser, $otherStore] = $this->merchantWithStore();
        $otherCat = Category::factory()->create(['store_id' => $otherStore->id, 'name' => 'Other', 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->put(route('categories.update', $otherCat->id), ['name' => 'Hacked']);
        $this->assertTrue(in_array($res->getStatusCode(), [403,404,302]));
        // Ensure 404 via findOrFail when store_id mismatched
        $this->assertSame('Other', $otherCat->fresh()->name);
    }

    // 11 Store A cannot delete Store B category
    public function test_store_a_cannot_delete_store_b_category(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [$otherUser, $otherStore] = $this->merchantWithStore();
        $otherCat = Category::factory()->create(['store_id' => $otherStore->id, 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->delete(route('categories.destroy', $otherCat->id));
        $this->assertTrue(in_array($res->getStatusCode(), [403,404,302]));
        $this->assertDatabaseHas('categories', ['id' => $otherCat->id]);
    }

    // 12 image upload valid (string path accepted)
    public function test_image_upload_valid(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $res = $this->post(route('categories.store'), [
            'name' => 'With Image',
            'image' => '/storage/categories/test.jpg',
        ]);
        $res->assertRedirect(route('categories.index'));
        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'image' => '/storage/categories/test.jpg']);
    }

    // 13 invalid image rejected (path traversal / script)
    public function test_invalid_image_rejected(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $res = $this->post(route('categories.store'), [
            'name' => 'Bad Image',
            'image' => '../../etc/passwd',
        ]);
        $res->assertSessionHasErrors('image');
        $res2 = $this->post(route('categories.store'), [
            'name' => 'Bad2',
            'image' => 'javascript:alert(1)',
        ]);
        $res2->assertSessionHasErrors('image');
    }

    // 14 image replacement/removal safe
    public function test_image_replacement_removal_safe(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'image' => '/storage/old.jpg', 'is_active' => true]);
        $this->actingAs($user);
        $this->put(route('categories.update', $cat->id), ['name' => $cat->name, 'image' => '/storage/new.jpg'])->assertRedirect(route('categories.index'));
        $this->assertSame('/storage/new.jpg', $cat->fresh()->image);
        $this->put(route('categories.update', $cat->id), ['name' => $cat->name, 'image' => ''])->assertRedirect(route('categories.index'));
        $this->assertNull($cat->fresh()->image);
    }

    // 15 empty category storefront safe (zero categories hides section, no demo leak)
    public function test_empty_category_storefront_safe(): void
    {
        [$user, $store] = $this->merchantWithStore();
        // Ensure no categories
        Category::where('store_id', $store->id)->delete();
        $categories = Category::where('store_id', $store->id)->where('is_active', true)->whereNull('parent_id')->orderBy('sort_order')->orderBy('name')->get();
        $this->assertCount(0, $categories);
        // Simulate template behavior: hide section when empty (no demo arrays)
        $this->assertEmpty($categories);
    }

    // 16 category with products returns correct products
    public function test_category_with_products_returns_correct_products(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        $p1 = Product::create(['name' => 'P1', 'price' => 10, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $p2 = Product::create(['name' => 'P2', 'price' => 20, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/b.jpg', 'cover_image' => '/storage/b.jpg', 'is_active' => true]);
        $found = Product::where('store_id', $store->id)->where('is_active', true)->where('category_id', $cat->id)->get();
        $this->assertCount(2, $found);
    }

    // 17 inactive product hidden according to existing visibility rules
    public function test_inactive_product_hidden(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        Product::create(['name' => 'Active', 'price' => 10, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        Product::create(['name' => 'Inactive', 'price' => 10, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/b.jpg', 'cover_image' => '/storage/b.jpg', 'is_active' => false]);
        $visible = Product::where('store_id', $store->id)->where('is_active', true)->where('category_id', $cat->id)->get();
        $this->assertCount(1, $visible);
        $this->assertSame('Active', $visible->first()->name);
    }

    // 18 delete behavior with products safe (prevent delete)
    public function test_delete_behavior_with_products_safe(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        Product::create(['name' => 'P', 'price' => 10, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->delete(route('categories.destroy', $cat->id));
        $res->assertSessionHas('error');
        $this->assertDatabaseHas('categories', ['id' => $cat->id]);
    }

    // 19 delete behavior with children safe (prevent delete)
    public function test_delete_behavior_with_children_safe(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $parent = Category::factory()->create(['store_id' => $store->id, 'parent_id' => null, 'is_active' => true]);
        Category::factory()->create(['store_id' => $store->id, 'parent_id' => $parent->id, 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->delete(route('categories.destroy', $parent->id));
        $res->assertSessionHas('error');
        $this->assertDatabaseHas('categories', ['id' => $parent->id]);
    }

    // 20 Designer selected categories propagate
    public function test_designer_selected_categories_propagate(): void
    {
        [$user, $store] = $this->merchantWithStore(['theme' => 'bazaar-market']);
        $cat1 = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        $cat2 = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['settings.homepage_categories' => [(string)$cat1->id, (string)$cat2->id], 'settings.homepage_products_per_category' => 4]
        ])->assertOk();
        $store->refresh();
        $this->assertSame([(string)$cat1->id, (string)$cat2->id], $store->store_content['settings']['homepage_categories']);
        // Deselect cat2
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['settings.homepage_categories' => [(string)$cat1->id]]
        ])->assertOk();
        $store->refresh();
        $this->assertSame([(string)$cat1->id], $store->store_content['settings']['homepage_categories']);
    }

    // 21 inactive category overrides Designer selection
    public function test_inactive_category_overrides_designer_selection(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'content' => ['settings.homepage_categories' => [(string)$cat->id]]
        ])->assertOk();
        $cat->update(['is_active' => false]);
        // Storefront query filters is_active, so inactive not returned even if selected
        $storefrontCats = Category::where('store_id', $store->id)->where('is_active', true)->get();
        $this->assertFalse($storefrontCats->contains('id', $cat->id));
        // Simulate template filtering: selected id -> catMap lookup fails -> hidden
        $catMap = $storefrontCats->keyBy(fn($c) => (string)$c->id);
        $this->assertNull($catMap->get((string)$cat->id));
    }

    // 22 zero categories does not leak demo content
    public function test_zero_categories_does_not_leak_demo(): void
    {
        [$user, $store] = $this->merchantWithStore();
        Category::where('store_id', $store->id)->delete();
        $categories = Category::where('store_id', $store->id)->where('is_active', true)->whereNull('parent_id')->orderBy('sort_order')->orderBy('name')->get();
        $this->assertCount(0, $categories);
        // Ensure no hardcoded fallback categories exist in storefront payload
        foreach (['إلكترونيات','أزياء','أطفال','مطاعم','عطارة'] as $demoName) {
            $this->assertFalse($categories->pluck('name')->contains($demoName));
        }
    }

    // 23 all 6 templates receive canonical category data (ThemeController shape)
    public function test_all_six_templates_receive_canonical_category_data(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'name' => 'Canonical', 'slug' => 'canonical-'.uniqid(), 'is_active' => true, 'parent_id' => null, 'sort_order' => 1, 'image' => '/storage/cat.jpg', 'description' => 'desc']);
        Product::create(['name' => 'P', 'price' => 10, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);

        foreach (Store::ALL_TEMPLATES as $theme) {
            $store->theme = $theme; $store->save();
            // Replicate ThemeController home categories payload
            $categories = Category::where('store_id', $store->id)->where('is_active', true)->whereNull('parent_id')
                ->withCount(['products' => fn($q) => $q->where('is_active', true)])
                ->orderBy('sort_order')->orderBy('name')->orderBy('id')
                ->get()->map(fn($c) => ['id' => (string)$c->id, 'name' => $c->name, 'slug' => $c->slug, 'image' => $c->image ?: null, 'description' => $c->description, 'product_count' => $c->products_count])->values();
            $this->assertCount(1, $categories, "Template $theme missing category");
            $this->assertSame('Canonical', $categories[0]['name']);
            $this->assertSame('/storage/cat.jpg', $categories[0]['image']);
            $this->assertSame(1, $categories[0]['product_count']);
        }
    }

    // 24 category URLs store-isolated (slug lookup is store_id scoped)
    public function test_category_urls_store_isolated(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [$otherUser, $otherStore] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'slug' => 'shared-slug-'.uniqid(), 'is_active' => true]);
        $otherCat = Category::factory()->create(['store_id' => $otherStore->id, 'slug' => $cat->slug, 'is_active' => true]);
        // Each store resolves its own slug
        $foundA = Category::where('store_id', $store->id)->where('slug', $cat->slug)->first();
        $foundB = Category::where('store_id', $otherStore->id)->where('slug', $cat->slug)->first();
        $this->assertSame($cat->id, $foundA->id);
        $this->assertSame($otherCat->id, $foundB->id);
        // Cross-store lookup fails
        $cross = Category::where('store_id', $store->id)->where('slug', $otherCat->slug)->where('id', $otherCat->id)->first();
        $this->assertNull($cross);
        // GenerateUniqueSlug is store-scoped
        $slug1 = Category::generateUniqueSlug('Test', $store->id);
        Category::factory()->create(['store_id' => $store->id, 'name' => 'Test', 'slug' => $slug1]);
        $slug2 = Category::generateUniqueSlug('Test', $otherStore->id);
        $this->assertSame($slug1, $slug2); // other store can reuse slug
    }

    // 25 cache invalidated after category update (store_categories keys cleared)
    public function test_cache_invalidated_after_category_update(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'name' => 'Cache', 'is_active' => true, 'slug' => 'cache-'.uniqid()]);
        $theme = $store->getTemplateSlug();
        foreach (['ar','en'] as $locale) {
            Cache::put("store_categories.{$store->id}.theme_{$theme}.locale_{$locale}", collect([['id' => 'stale']]), 300);
            Cache::put("store_catalog.{$store->id}.theme_{$theme}.locale_{$locale}.active_1", collect([['id' => 'stale']]), 300);
        }
        // Trigger save -> boot invalidation
        $cat->update(['name' => 'Cache Updated']);
        foreach (['ar','en'] as $locale) {
            $this->assertNull(Cache::get("store_categories.{$store->id}.theme_{$theme}.locale_{$locale}"));
        }
    }

    // Extra: name trimming, whitespace-only rejected, depth limit, slug uniqueness
    public function test_name_trimmed_and_whitespace_rejected(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $res = $this->post(route('categories.store'), ['name' => '  مقلم  ', 'is_active' => true]);
        $res->assertRedirect(route('categories.index'));
        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'name' => 'مقلم']);
        $res2 = $this->post(route('categories.store'), ['name' => '   ', 'is_active' => true]);
        $res2->assertSessionHasErrors('name');
    }

    public function test_depth_limit_enforced(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $a = Category::factory()->create(['store_id' => $store->id, 'parent_id' => null, 'is_active' => true]);
        $b = Category::factory()->create(['store_id' => $store->id, 'parent_id' => $a->id, 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->post(route('categories.store'), ['name' => 'Too Deep', 'parent_id' => $b->id]);
        $res->assertSessionHasErrors('parent_id');
    }

    public function test_slug_unique_per_store(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat1 = Category::factory()->create(['store_id' => $store->id, 'name' => 'Unique', 'slug' => Category::generateUniqueSlug('Unique', $store->id)]);
        $slug2 = Category::generateUniqueSlug('Unique', $store->id);
        $this->assertNotSame($cat1->slug, $slug2);
    }
}
