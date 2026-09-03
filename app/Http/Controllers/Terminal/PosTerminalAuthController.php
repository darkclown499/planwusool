<?php

namespace App\Http\Controllers\Terminal;

use App\Http\Controllers\Controller;
use App\Models\PosTerminal;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Dedicated POS terminal / cashier sign-in.
 *
 * A terminal credential is a (store, username, PIN) triple. The PIN is only
 * ever stored as a bcrypt hash and never travels in any URL/query string.
 * Login needs no merchant ``web`` user — the ``pos_terminal`` guard keeps the
 * cashier fully isolated from the merchant dashboard.
 */
class PosTerminalAuthController extends Controller
{
    public function create(Request $request)
    {
        if (Auth::guard('pos_terminal')->check()) {
            return redirect()->route('pos.terminal.register');
        }

        return Inertia::render('pos/terminal/login', [
            'store' => $request->input('store', ''),
            'username' => $request->input('username', ''),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'store' => 'required|string|max:255',
            'username' => 'required|string|max:60',
            'pin' => 'required|string|max:20',
        ]);

        $terminal = $this->resolveTerminal($request->input('store'), $request->input('username'));

        if (!$terminal || !Hash::check((string) $request->input('pin'), $terminal->pin_hash) || !$terminal->is_active) {
            throw ValidationException::withMessages([
                'pin' => __('بيانات تسجيل الدخول غير صحيحة.'),
            ]);
        }

        // A dedicated POS terminal must be an isolated, cashier-only session. If this
        // browser happened to be signed in as a merchant on the `web` guard, that session
        // is deliberately dropped here so terminal mode never preserves (or silently keeps
        // alive) an authenticated merchant dashboard session. Guards resolve per-session in
        // Laravel, so an earlier merchant login would otherwise still satisfy `auth:web` on
        // dashboard routes. Logging out `web` here makes the transition explicit and safe;
        // customer/storefront auth is untouched (it lives on its own guard and context).
        Auth::guard('web')->logout();
        // Session regeneration prevents session-fixation on every cashier sign-in.
        $request->session()->regenerate();
        Auth::guard('pos_terminal')->login($terminal, false);

        $terminal->forceFill(['last_login_at' => now()])->save();

        return redirect()->route('pos.terminal.register');
    }

    public function destroy(Request $request)
    {
        Auth::guard('pos_terminal')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('pos.terminal.login');
    }

    /**
     * Resolve a terminal by its store + username. The store field may be either
     * the store slug or the numeric store id.
     */
    private function resolveTerminal(string $storeRef, string $username): ?PosTerminal
    {
        $storeRef = trim($storeRef);
        $storeQuery = (ctype_digit($storeRef))
            ? Store::where('id', (int) $storeRef)
            : Store::where('slug', $storeRef);

        $store = $storeQuery->first();
        if (!$store) {
            return null;
        }

        return PosTerminal::where('store_id', $store->id)
            ->where('username', $username)
            ->first();
    }
}
