<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        
        // Remove _method from validated data if present
        unset($validated['_method']);
        
        // Handle avatar upload
        if ($request->hasFile('avatar')) {
            \App\Services\DynamicStorageService::configureDynamicDisks();
            $activeDisk = \App\Services\StorageConfigService::getActiveDisk();
            
            // Delete old avatar if exists
            $oldAvatar = $request->user()->getRawOriginal('avatar');
            if ($oldAvatar) {
                // Remove base URL if present
                $path = parse_url($oldAvatar, PHP_URL_PATH);
                $path = ltrim($path ?? '', '/');
                if (str_starts_with($path, 'storage/')) {
                    $path = substr($path, 8); // remove 'storage/'
                }
                
                if (Storage::disk($activeDisk)->exists($path)) {
                    Storage::disk($activeDisk)->delete($path);
                } elseif (Storage::disk('public')->exists($path)) {
                    // Fallback to delete old local avatars
                    Storage::disk('public')->delete($path);
                }
            }
            
            // Store new avatar in media/avatars and save ONLY path to database
            // Add 'public' visibility so permission errors don't happen locally or on S3
            $avatarPath = $request->file('avatar')->storePublicly('media/avatars', ['disk' => $activeDisk]);
            
            $validated['avatar'] = $avatarPath;
        }
        
        $request->user()->fill($validated);

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
