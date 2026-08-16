<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreOffer;
use Illuminate\Http\Request;

class StoreOfferController extends Controller
{
    public function index(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'offers' => $store->offers()->with('product:id,name,price,sale_price')->get(),
        ]);
    }

    public function store(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $caps = getTemplateCapabilities($request->user());
        if (!$caps['offers']) {
            return response()->json(['error' => 'Offers require the Growth plan or above.'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'image' => 'nullable|string|max:500',
            'product_id' => 'nullable|exists:products,id',
            'link' => 'nullable|string|max:500',
            'discount_percent' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $offer = $store->offers()->create($validated);

        return response()->json(['success' => true, 'offer' => $offer], 201);
    }

    public function update(Request $request, Store $store, StoreOffer $offer)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ((int) $offer->store_id !== (int) $store->id) {
            return response()->json(['error' => 'Offer does not belong to this store.'], 403);
        }

        $caps = getTemplateCapabilities($request->user());
        if (!$caps['offers']) {
            return response()->json(['error' => 'Offers require the Growth plan or above.'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'image' => 'nullable|string|max:500',
            'product_id' => 'nullable|exists:products,id',
            'link' => 'nullable|string|max:500',
            'discount_percent' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $offer->update($validated);

        return response()->json(['success' => true, 'offer' => $offer->fresh()]);
    }

    public function destroy(Request $request, Store $store, StoreOffer $offer)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ((int) $offer->store_id !== (int) $store->id) {
            return response()->json(['error' => 'Offer does not belong to this store.'], 403);
        }

        $offer->delete();

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

        foreach ($validated['order'] as $index => $offerId) {
            StoreOffer::where('id', $offerId)->where('store_id', $store->id)
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