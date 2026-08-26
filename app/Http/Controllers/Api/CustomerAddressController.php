<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomerAddressController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
        ]);

        $customer = Auth::guard('customer')->user();
        if (!$customer) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }
        if ((int) $customer->store_id !== (int) $request->store_id) {
            return response()->json(['error' => 'Store mismatch'], 403);
        }

        $addresses = CustomerAddress::where('customer_id', $customer->id)
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'type' => $a->type,
                'address' => $a->address,
                'city' => $a->city,
                'state' => $a->state,
                'postal_code' => $a->postal_code,
                'country' => $a->country,
                'is_default' => (bool) $a->is_default,
                'formatted' => $a->formatted_address,
            ]);

        return response()->json(['addresses' => $addresses]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'type' => 'required|in:billing,shipping',
            'address' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'required|string|max:100',
            'is_default' => 'nullable|boolean',
        ]);

        $customer = Auth::guard('customer')->user();
        if (!$customer) return response()->json(['error' => 'Unauthenticated'], 401);
        if ((int) $customer->store_id !== (int) $request->store_id) return response()->json(['error' => 'Store mismatch'], 403);

        $isDefault = $request->boolean('is_default');
        // If first address, make default regardless
        $existingCount = CustomerAddress::where('customer_id', $customer->id)->count();
        if ($existingCount === 0) $isDefault = true;

        if ($isDefault) {
            CustomerAddress::where('customer_id', $customer->id)->where('type', $request->type)->update(['is_default' => false]);
        }

        $address = CustomerAddress::create([
            'customer_id' => $customer->id,
            'type' => $request->type,
            'address' => $request->address,
            'city' => $request->city,
            'state' => $request->state ?? '',
            'postal_code' => $request->postal_code ?? '',
            'country' => $request->country,
            'is_default' => $isDefault,
        ]);

        return response()->json(['success' => true, 'address' => $address]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'type' => 'sometimes|in:billing,shipping',
            'address' => 'sometimes|required|string|max:255',
            'city' => 'sometimes|required|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'sometimes|required|string|max:100',
            'is_default' => 'nullable|boolean',
        ]);

        $customer = Auth::guard('customer')->user();
        if (!$customer) return response()->json(['error' => 'Unauthenticated'], 401);
        if ((int) $customer->store_id !== (int) $request->store_id) return response()->json(['error' => 'Store mismatch'], 403);

        $address = CustomerAddress::where('id', $id)->where('customer_id', $customer->id)->first();
        if (!$address) return response()->json(['error' => 'Address not found'], 404);

        $data = $request->only(['type', 'address', 'city', 'state', 'postal_code', 'country']);
        // filter nulls so partial updates work
        $data = array_filter($data, fn ($v) => $v !== null);

        if ($request->has('is_default') && $request->boolean('is_default')) {
            CustomerAddress::where('customer_id', $customer->id)->where('type', $address->type)->update(['is_default' => false]);
            $data['is_default'] = true;
        } elseif ($request->has('is_default') && !$request->boolean('is_default')) {
            $data['is_default'] = false;
        }

        $address->update($data);

        return response()->json(['success' => true, 'address' => $address]);
    }

    public function destroy(Request $request, $id)
    {
        $request->validate(['store_id' => 'required|exists:stores,id']);
        $customer = Auth::guard('customer')->user();
        if (!$customer) return response()->json(['error' => 'Unauthenticated'], 401);
        if ((int) $customer->store_id !== (int) $request->store_id) return response()->json(['error' => 'Store mismatch'], 403);

        $address = CustomerAddress::where('id', $id)->where('customer_id', $customer->id)->first();
        if (!$address) return response()->json(['error' => 'Address not found'], 404);

        $wasDefault = (bool) $address->is_default;
        $type = $address->type;
        $address->delete();

        if ($wasDefault) {
            $next = CustomerAddress::where('customer_id', $customer->id)->where('type', $type)->first();
            if ($next) $next->update(['is_default' => true]);
        }

        return response()->json(['success' => true]);
    }

    public function setDefault(Request $request, $id)
    {
        $request->validate(['store_id' => 'required|exists:stores,id']);
        $customer = Auth::guard('customer')->user();
        if (!$customer) return response()->json(['error' => 'Unauthenticated'], 401);
        if ((int) $customer->store_id !== (int) $request->store_id) return response()->json(['error' => 'Store mismatch'], 403);

        $address = CustomerAddress::where('id', $id)->where('customer_id', $customer->id)->first();
        if (!$address) return response()->json(['error' => 'Address not found'], 404);

        CustomerAddress::where('customer_id', $customer->id)->where('type', $address->type)->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json(['success' => true]);
    }
}
