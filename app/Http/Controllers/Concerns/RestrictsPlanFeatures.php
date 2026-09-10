<?php

namespace App\Http\Controllers\Concerns;

trait RestrictsPlanFeatures
{
    /**
     * Deny access to a plan-gated feature with a merchant-facing Arabic message.
     * API/JSON callers receive 403 JSON; Inertia/normal postbacks redirect back with an error.
     *
     * @param  string  $featureKey  Canonical feature key from CheckPlanAccess::featureColumnMap()
     */
    protected function denyPlanFeatureAccess(string $featureKey = 'shipping_method'): \Symfony\Component\HttpFoundation\Response
    {
        $columnMap = \App\Http\Middleware\CheckPlanAccess::featureColumnMap();
        $column = $columnMap[$featureKey] ?? $featureKey;
        $label = ucfirst(str_replace('_', ' ', $featureKey));

        $message = "ميزة {$label} متاحة في الخطة المحددة أو أعلى. يمكنك ترقية خطتك للوصول إليها.";
        if (request()->expectsJson()) {
            return response()->json(['success' => false, 'message' => $message], 403);
        }
        return redirect()->back()->with('error', $message);
    }
}