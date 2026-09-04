<?php

namespace App\Http\Controllers\Concerns;

trait RestrictsPlanFeatures
{
    /**
     * Deny access to a plan-gated feature with a merchant-facing Arabic message.
     * API/JSON callers receive 403 JSON; Inertia/normal postbacks redirect back with an error.
     */
    protected function denyPlanFeatureAccess(): \Symfony\Component\HttpFoundation\Response
    {
        $message = 'طرق الشحن والتوصيل متاحة في خطة Growth أو أعلى. يمكنك ترقية خطتك للوصول إليها.';
        if (request()->expectsJson()) {
            return response()->json(['success' => false, 'message' => $message], 403);
        }
        return redirect()->back()->with('error', $message);
    }
}