<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\Template;
use App\Services\DemoStoreService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StoreTemplateController extends Controller
{
    /**
     * Resolve the store the current user is allowed to manage.
     */
    private function resolveStore($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            abort(403, __('You do not have permission to access store templates.'));
        }

        return resolveStoreQuery(Auth::user())->findOrFail($storeId);
    }

    /**
     * Show the template selection page.
     */
    public function show($storeId)
    {
        $store = $this->resolveStore($storeId);
        $user = Auth::user();
        $plan = $user->getCurrentPlan();

        $templates = Template::where('is_active', true)
            ->orderBy('is_free', 'desc')
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($template) => [
                'slug' => $template->slug,
                'name' => $template->name,
                'name_en' => $template->name_en,
                'description' => $template->description,
                'category' => $template->category,
                'is_free' => (bool) $template->is_free,
                'plan_required' => $template->plan_required,
                'design_tokens' => $template->design_tokens,
            ]);

        $demoStoreService = app(DemoStoreService::class);

        return Inertia::render('stores/template-select', [
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'theme' => $store->getTemplateSlug(),
                'template_slug' => $store->getTemplateSlug(),
                'store_url' => $store->getStoreSubdomainUrl(),
            ],
            'templates' => $templates,
            'userPlanName' => $plan ? $plan->name : null,
            'userPlanTier' => $plan ? $plan->getTier() : 'starter',
            'isSuperAdmin' => $user->type === 'superadmin',
            'demoStoreUrl' => $demoStoreService->demoStoreUrl(),
        ]);
    }

    /**
     * Save the selected template for the store.
     */
    public function update(Request $request, $storeId)
    {
        $store = $this->resolveStore($storeId);
        $user = Auth::user();

        $request->validate([
            'template_slug' => ['required', 'string', 'max:255'],
        ]);

        $template = Template::where('slug', $request->template_slug)
            ->where('is_active', true)
            ->first();

        if (!$template) {
            return back()->with('error', __('Template not found.'));
        }

        if (!$store->canUseTemplate($template->slug)) {
            return back()->with('error', __('Your plan does not allow this template. Please upgrade to use it.'));
        }

        $store->theme = $template->slug;
        $store->template_slug = $template->slug;
        $store->save();

        return redirect()->route('stores.template-select', $store->id)
            ->with('success', __('Template updated successfully.'));
    }
}
