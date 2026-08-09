<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Template;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    /**
     * List all templates with access info.
     */
    public function index(Request $request)
    {
        $templates = Template::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $user = $request->user();

        $templates = $templates->map(function ($template) use ($user) {
            $planTier = $this->getUserPlanTier($user);

            return [
                'slug' => $template->slug,
                'name' => $template->name,
                'name_en' => $template->name_en,
                'description' => $template->description,
                'category' => $template->category,
                'is_free' => (bool) $template->is_free,
                'plan_required' => $template->plan_required,
                'is_accessible' => $template->is_free || $template->isAccessibleForPlan($planTier),
                'sort_order' => $template->sort_order,
            ];
        });

        return response()->json(['templates' => $templates]);
    }

    /**
     * Get a single template's full config.
     */
    public function show(Request $request, string $slug)
    {
        $template = Template::where('slug', $slug)->where('is_active', true)->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $user = $request->user();
        $planTier = $this->getUserPlanTier($user);
        $isAccessible = $template->is_free || $template->isAccessibleForPlan($planTier);

        return response()->json([
            'template' => [
                'slug' => $template->slug,
                'name' => $template->name,
                'name_en' => $template->name_en,
                'description' => $template->description,
                'category' => $template->category,
                'is_free' => (bool) $template->is_free,
                'plan_required' => $template->plan_required,
                'is_accessible' => $isAccessible,
                'config' => $isAccessible ? $template->config : null,
                'design_tokens' => $template->design_tokens,
                'advanced_components' => $isAccessible ? $template->advanced_components : [],
            ],
        ]);
    }

    /**
     * Get preview config (public - for showcase/demo).
     * Allows showing template config to all users but config is read-only.
     */
    public function preview(string $slug)
    {
        $template = Template::where('slug', $slug)->where('is_active', true)->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        return response()->json([
            'template' => [
                'slug' => $template->slug,
                'name' => $template->name,
                'name_en' => $template->name_en,
                'description' => $template->description,
                'category' => $template->category,
                'is_free' => (bool) $template->is_free,
                'plan_required' => $template->plan_required,
                'is_accessible' => false, // Preview always read-only
                'config' => $template->config,
                'design_tokens' => $template->design_tokens,
                'advanced_components' => $template->advanced_components,
                'is_preview' => true,
            ],
        ]);
    }

    /**
     * Get the user's plan tier.
     */
    protected function getUserPlanTier(?object $user): string
    {
        if (!$user || !$user->plan) {
            return 'starter';
        }

        return $user->plan->getTier();
    }
}