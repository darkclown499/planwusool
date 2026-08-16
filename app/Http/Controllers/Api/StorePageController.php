<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StorePage;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StorePageController extends Controller
{
    public function index(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'pages' => $store->pages()->get(),
        ]);
    }

    public function store(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $caps = getTemplateCapabilities($request->user());
        if (!$caps['pages']) {
            return response()->json(['error' => 'Custom pages require the Professional plan.'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|regex:/^[a-z0-9\-]+$/',
            'content' => 'nullable|string',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'image' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $slug = $validated['slug'] ?? Str::slug($validated['title'], '-');
        $slug = $slug === '' ? 'page' : $slug;

        if ($store->pages()->where('slug', $slug)->exists()) {
            return response()->json(['error' => 'A page with this slug already exists.'], 422);
        }

        $page = $store->pages()->create(array_merge($validated, ['slug' => $slug]));

        return response()->json(['success' => true, 'page' => $page], 201);
    }

    public function update(Request $request, Store $store, StorePage $page)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ((int) $page->store_id !== (int) $store->id) {
            return response()->json(['error' => 'Page does not belong to this store.'], 403);
        }

        $caps = getTemplateCapabilities($request->user());
        if (!$caps['pages']) {
            return response()->json(['error' => 'Custom pages require the Professional plan.'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|regex:/^[a-z0-9\-]+$/',
            'content' => 'nullable|string',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'image' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        if (isset($validated['slug'])) {
            $exists = $store->pages()
                ->where('slug', $validated['slug'])
                ->where('id', '!=', $page->id)
                ->exists();
            if ($exists) {
                return response()->json(['error' => 'A page with this slug already exists.'], 422);
            }
        }

        $page->update($validated);

        return response()->json(['success' => true, 'page' => $page->fresh()]);
    }

    public function destroy(Request $request, Store $store, StorePage $page)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ((int) $page->store_id !== (int) $store->id) {
            return response()->json(['error' => 'Page does not belong to this store.'], 403);
        }

        $page->delete();

        return response()->json(['success' => true]);
    }

    public function reorder(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer',
        ]);

        foreach ($validated['order'] as $index => $pageId) {
            StorePage::where('id', $pageId)->where('store_id', $store->id)
                ->update(['sort_order' => $index]);
        }

        return response()->json(['success' => true]);
    }

    protected function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }

        return (int) $store->user_id === (int) $user->id
            || (int) $store->id === (int) ($user->current_store ?? 0);
    }
}