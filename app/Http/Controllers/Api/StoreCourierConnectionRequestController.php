<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreCourierConnectionRequest;
use Illuminate\Http\Request;

class StoreCourierConnectionRequestController extends Controller
{
    private function authorizeStore(Request $request, Store $store): bool
    {
        $user = $request->user();
        if (!$user) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        return (int)$store->user_id === (int)$user->id || (int)$store->id === (int)($user->current_store ?? 0);
    }

    public function index(Request $request, Store $store)
    {
        if (!$this->authorizeStore($request,$store)) return response()->json(['error'=>'Unauthorized'],403);
        $reqs = StoreCourierConnectionRequest::where('store_id',$store->id)->orderByDesc('id')->get();
        return response()->json(['success'=>true,'requests'=>$reqs]);
    }

    public function store(Request $request, Store $store)
    {
        if (!$this->authorizeStore($request,$store)) return response()->json(['error'=>'Unauthorized'],403);
        $validated = $request->validate([
            'provider'=>'required|string|max:50',
            'contact_name'=>'nullable|string|max:100',
            'phone'=>'required|string|max:30',
            'email'=>'nullable|email|max:255',
            'has_existing_account'=>'sometimes|boolean',
            'account_number'=>'nullable|string|max:100',
            'notes'=>'nullable|string|max:2000',
        ]);

        // Only allow private/local providers for request flow
        $privateProviders = ['wassel','bosta','united_express','city_express'];
        if (!in_array(strtolower($validated['provider']), $privateProviders, true)) {
            return response()->json(['error'=>'This provider uses direct API connection, not request flow'],422);
        }

        $req = StoreCourierConnectionRequest::create([
            'store_id'=>$store->id,
            'user_id'=>$request->user()->id,
            'provider'=>strtolower($validated['provider']),
            'contact_name'=>$validated['contact_name'] ?? null,
            'phone'=>$validated['phone'],
            'email'=>$validated['email'] ?? null,
            'has_existing_account'=> (bool)($validated['has_existing_account'] ?? false),
            'account_number'=>$validated['account_number'] ?? null,
            'notes'=>$validated['notes'] ?? null,
            'status'=>'new',
        ]);
        return response()->json(['success'=>true,'request'=>$req]);
    }

    // Admin: update status (support flow)
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || (! $user->isSuperAdmin() && !$user->isAdmin())) {
            return response()->json(['error'=>'Unauthorized'],403);
        }
        $req = StoreCourierConnectionRequest::findOrFail($id);
        $validated = $request->validate([
            'status'=>'required|string|in:new,contacted,waiting_provider,credentials_received,configured,rejected',
        ]);
        $req->update(['status'=>$validated['status']]);
        return response()->json(['success'=>true,'request'=>$req]);
    }

    public function adminIndex(Request $request)
    {
        $user = $request->user();
        if (!$user || (! $user->isSuperAdmin() && !$user->isAdmin())) {
            return response()->json(['error'=>'Unauthorized'],403);
        }
        $reqs = StoreCourierConnectionRequest::with(['store','user'])->orderByDesc('id')->limit(100)->get();
        return response()->json(['success'=>true,'requests'=>$reqs]);
    }
}
