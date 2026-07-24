<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;

class UserLanguageController extends Controller
{
    public function update(Request $request)
    {
        $request->validate([
            'language' => 'required|string|max:5'
        ]);

        $user = Auth::user();
        if ($user) {
            // In demo mode, store language in cookie instead of database
            if (config('app.is_demo', false)) {
                $cookie = Cookie::make('demo_language', $request->language, 60 * 24 * 30); // 30 days
                return back()->cookie($cookie);
            }
            
            // Production mode: update database
            $user->update(['lang' => $request->language]);
            return back();
        }

        return back()->withErrors(['error' => 'Unauthorized']);
    }
}