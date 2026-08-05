<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class UpdateController extends Controller
{
    /**
     * Show the update page for super admins.
     */
    public function show()
    {
        return view('update');
    }

    /**
     * Run pending migrations after a deployment/update.
     */
    public function run(Request $request)
    {
        $request->validate([
            'confirm' => 'required|in:yes',
        ]);

        try {
            Artisan::call('migrate', ['--force' => true]);
            Artisan::call('optimize:clear');

            return redirect()->route('update.show')
                ->with('success', __('Update completed successfully!'));
        } catch (\Throwable $e) {
            return redirect()->route('update.show')
                ->with('error', __('Update failed: ') . $e->getMessage());
        }
    }
}
