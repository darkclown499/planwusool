<?php

namespace App\Http\Controllers;

use App\Models\PosTerminal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Merchant management of their own store's POS terminals/devices.
 *
 * Store scope always comes from the merchant's current store (getCurrentStoreId),
 * so a merchant can only ever manage terminals that belong to their own store.
 * PINs are stored only as bcrypt hashes and are never echoed back after creation
 * or reset — the raw PIN is shown exactly once at creation/replacement.
 */
class PosTerminalManagementController extends Controller
{
    public function index(Request $request)
    {
        $storeId = (int) getCurrentStoreId(Auth::user());
        $store = \App\Models\Store::where('id', $storeId)->first();

        $terminals = PosTerminal::where('store_id', $storeId)
            ->orderByDesc('id')
            ->get();

        return Inertia::render('pos/terminals', [
            'store' => $store ? ['id' => $store->id, 'name' => $store->name, 'slug' => $store->slug] : ['id' => $storeId, 'name' => '', 'slug' => ''],
            'terminals' => $terminals->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'username' => $t->username,
                'terminal_code' => $t->terminal_code,
                'is_active' => $t->is_active,
                'last_login_at' => $t->last_login_at?->toIso8601String(),
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $storeId = (int) getCurrentStoreId(Auth::user());

        $data = $request->validate([
            'name' => 'required|string|max:120',
            'username' => 'required|string|max:60|regex:/^[a-zA-Z0-9_.-]+$/',
            'pin' => 'required|string|min:4|max:20',
        ]);

        $exists = PosTerminal::where('store_id', $storeId)->where('username', $data['username'])->exists();
        if ($exists) {
            throw ValidationException::withMessages(['username' => 'اسم المستخدم مستخدم بالفعل لهذا المتجر.']);
        }

        $terminal = PosTerminal::create([
            'store_id' => $storeId,
            'name' => $data['name'],
            'username' => $data['username'],
            'pin_hash' => Hash::make($data['pin']),
            'terminal_code' => Str::upper(Str::random(12)),
            'is_active' => true,
        ]);

        return redirect()->route('pos.terminals.index')
            ->with('success', 'تم إنشاء الطرفية بنجاح.');
    }

    public function update(Request $request, $terminal)
    {
        $storeId = (int) getCurrentStoreId(Auth::user());
        $terminal = PosTerminal::where('id', $terminal)->where('store_id', $storeId)->firstOrFail();

        $data = $request->validate([
            'name' => 'required|string|max:120',
            'pin' => 'nullable|string|min:4|max:20',
            'is_active' => 'nullable|boolean',
        ]);

        $terminal->name = $data['name'];
        if (!empty($data['pin'])) {
            $terminal->pin_hash = Hash::make($data['pin']);
        }
        if (array_key_exists('is_active', $data)) {
            $terminal->is_active = (bool) $data['is_active'];
        }
        $terminal->save();

        return redirect()->route('pos.terminals.index')
            ->with('success', 'تم تحديث الطرفية بنجاح.');
    }

    public function toggle(Request $request, $terminal)
    {
        $storeId = (int) getCurrentStoreId(Auth::user());
        $terminal = PosTerminal::where('id', $terminal)->where('store_id', $storeId)->firstOrFail();

        $request->validate(['active' => 'required|boolean']);

        $terminal->is_active = (bool) $request->input('active');
        $terminal->save();

        return redirect()->route('pos.terminals.index')
            ->with('success', $terminal->is_active ? 'تم تفعيل الطرفية.' : 'تم إلغاء تفعيل الطرفية.');
    }

    public function destroy(Request $request, $terminal)
    {
        $storeId = (int) getCurrentStoreId(Auth::user());
        $terminal = PosTerminal::where('id', $terminal)->where('store_id', $storeId)->firstOrFail();

        $terminal->delete();

        return redirect()->route('pos.terminals.index')
            ->with('success', 'تم حذف الطرفية.');
    }
}
