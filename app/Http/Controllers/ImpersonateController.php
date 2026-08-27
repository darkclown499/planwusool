<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ImpersonateController extends Controller
{
    public function start(Request $request, $userId)
    {
        $actor = $request->user();

        if (!$actor) {
            abort(403, 'Unauthenticated');
        }

        // Only superadmin / allowed impersonator
        if (!$actor->canImpersonate()) {
            abort(403, 'Only superadmin can impersonate');
        }

        // No nested impersonation
        if (session()->has('impersonated_by')) {
            return redirect()->back()->with('error', __('Already impersonating a user. Leave current impersonation first.'));
        }

        $target = User::findOrFail($userId);

        // Target must be impersonatable and not superadmin
        if (!$target->canBeImpersonated()) {
            abort(403, 'Target cannot be impersonated');
        }

        if ($target->isSuperAdmin()) {
            abort(403, 'Cannot impersonate superadmin');
        }

        // Explicit type guard: only company users are impersonatable (canBeImpersonated already enforces, but be explicit)
        if ($target->type !== 'company') {
            abort(403, 'Only company users can be impersonated');
        }

        $originalUserId = $actor->id;

        Log::info('Impersonation started', [
            'actor_id' => $originalUserId,
            'target_id' => $target->id,
            'ip' => $request->ip(),
        ]);

        auth()->loginUsingId($target->id);
        session()->put('impersonated_user_id', $target->id);
        session()->put('impersonated_by', $originalUserId);
        session()->save();

        return redirect('/dashboard')->with('success', __('Now impersonating :name', ['name' => $target->name]));
    }

    public function leave(Request $request)
    {
        $originalUserId = session('impersonated_by');

        if (!$originalUserId) {
            return redirect('/login')->with('error', __('No active impersonation session'));
        }

        $originalUser = User::find($originalUserId);

        if (!$originalUser || !$originalUser->canImpersonate()) {
            session()->forget('impersonated_by');
            session()->forget('impersonated_user_id');
            session()->save();
            auth()->logout();

            return redirect('/login')->with('error', __('Original impersonator no longer authorized'));
        }

        Log::info('Impersonation ended', [
            'actor_id' => $originalUserId,
            'impersonated_id' => session('impersonated_user_id'),
            'ip' => $request->ip(),
        ]);

        auth()->loginUsingId($originalUserId);
        session()->forget('impersonated_by');
        session()->forget('impersonated_user_id');
        session()->save();

        return redirect('/companies')->with('success', __('Returned to admin panel'));
    }
}