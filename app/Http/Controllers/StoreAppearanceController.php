<?php

namespace App\Http\Controllers;

use App\Models\StoreConfiguration;
use App\Models\StoreConfigurationRevision;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StoreAppearanceController extends Controller
{
    private function resolveStore($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            abort(403, __('You do not have permission to access store appearance settings.'));
        }

        $user = Auth::user();

        return resolveStoreQuery($user)->findOrFail($storeId);
    }

    public function show($storeId)
    {
        $store = $this->resolveStore($storeId);
        $configuration = StoreConfiguration::getConfiguration($storeId);

        $revisions = StoreConfigurationRevision::where('store_id', $storeId)
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get()
            ->map(function ($revision) {
                return [
                    'id' => $revision->id,
                    'key' => $revision->key,
                    'previous_value' => $revision->previous_value,
                    'new_value' => $revision->new_value,
                    'reason' => $revision->reason,
                    'created_at' => $revision->created_at->toISOString(),
                    'user' => $revision->user ? $revision->user->name : null,
                ];
            });

        return Inertia::render('stores/appearance', [
            'store' => $store,
            'settings' => [
                'custom_css' => $configuration['custom_css'] ?? '',
                'custom_javascript' => $configuration['custom_javascript'] ?? '',
            ],
            'revisions' => $revisions,
        ]);
    }

    public function update(Request $request, $storeId)
    {
        $store = $this->resolveStore($storeId);

        $validated = $request->validate([
            'custom_css' => 'nullable|string|max:50000',
            'custom_javascript' => 'nullable|string|max:50000',
        ]);

        $user = Auth::user();

        foreach (['custom_css', 'custom_javascript'] as $key) {
            if (array_key_exists($key, $validated)) {
                $previous = StoreConfiguration::where('store_id', $storeId)
                    ->where('key', $key)
                    ->value('value');

                StoreConfiguration::setConfiguration($storeId, $key, $validated[$key]);

                StoreConfigurationRevision::record(
                    $storeId,
                    $key,
                    $previous,
                    $validated[$key],
                    $user->id,
                    'manual'
                );
            }
        }

        return redirect()->back()->with('success', __('Appearance settings updated successfully.'));
    }

    public function autosave(Request $request, $storeId)
    {
        $store = $this->resolveStore($storeId);

        $validated = $request->validate([
            'custom_css' => 'nullable|string|max:50000',
            'custom_javascript' => 'nullable|string|max:50000',
        ]);

        $user = Auth::user();

        foreach (['custom_css', 'custom_javascript'] as $key) {
            if (array_key_exists($key, $validated)) {
                $previous = StoreConfiguration::where('store_id', $storeId)
                    ->where('key', $key)
                    ->value('value');

                StoreConfiguration::setConfiguration($storeId, $key, $validated[$key]);

                StoreConfigurationRevision::record(
                    $storeId,
                    $key,
                    $previous,
                    $validated[$key],
                    $user->id,
                    'autosave'
                );
            }
        }

        return response()->json(['status' => 'ok']);
    }

    public function revert($storeId, $revisionId)
    {
        $store = $this->resolveStore($storeId);

        $revision = StoreConfigurationRevision::where('store_id', $storeId)
            ->findOrFail($revisionId);

        $previous = $revision->previous_value;

        StoreConfiguration::setConfiguration($storeId, $revision->key, $previous);

        StoreConfigurationRevision::record(
            $storeId,
            $revision->key,
            $revision->new_value,
            $previous,
            Auth::user()->id,
            'revert'
        );

        return redirect()->back()->with('success', __('The previous version has been restored.'));
    }

    public function reset($storeId)
    {
        $store = $this->resolveStore($storeId);

        foreach (['custom_css', 'custom_javascript'] as $key) {
            $previous = StoreConfiguration::where('store_id', $storeId)
                ->where('key', $key)
                ->value('value');

            StoreConfiguration::setConfiguration($storeId, $key, '');

            StoreConfigurationRevision::record(
                $storeId,
                $key,
                $previous,
                '',
                Auth::user()->id,
                'reset'
            );
        }

        return redirect()->back()->with('success', __('Custom code has been reset to default.'));
    }
}
