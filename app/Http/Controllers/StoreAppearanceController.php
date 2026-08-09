<?php

namespace App\Http\Controllers;

use App\Models\Template;
use App\Services\DemoStoreService;
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
        $user = Auth::user();
        $plan = $user->getCurrentPlan();

        $template = Template::where('slug', $store->getTemplateSlug())
            ->where('is_active', true)
            ->first();

        $demoStoreService = app(DemoStoreService::class);

        return Inertia::render('stores/appearance', [
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
                'theme' => $store->getTemplateSlug(),
                'template_slug' => $store->getTemplateSlug(),
                'design_tokens' => $store->design_tokens ?? [],
                'store_url' => $store->getStoreSubdomainUrl(),
            ],
            'currentTemplate' => $template ? [
                'slug' => $template->slug,
                'name' => $template->name,
                'name_en' => $template->name_en,
                'description' => $template->description,
                'category' => $template->category,
                'is_free' => (bool) $template->is_free,
                'plan_required' => $template->plan_required,
                'design_tokens' => $template->design_tokens,
                'sections' => $template->config['sections'] ?? [],
                'layout' => $template->config['layout'] ?? ['container' => 'container mx-auto px-4', 'spacing' => 'normal'],
            ] : null,
            'userPlanName' => $plan ? $plan->name : null,
            'userPlanTier' => $plan ? $plan->getTier() : 'starter',
            'isSuperAdmin' => $user->type === 'superadmin',
            'demoStoreUrl' => $demoStoreService->demoStoreUrl(),
        ]);
    }
}
