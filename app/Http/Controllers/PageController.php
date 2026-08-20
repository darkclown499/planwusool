<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

/**
 * Serves simple dashboard pages that only render an Inertia component
 * without any controller-specific data logic.
 */
class PageController extends Controller
{
    public function paymentGateways()
    {
        return Inertia::render('payment-gateways/index');
    }

    public function aiTemplates()
    {
        return Inertia::render('ai-templates/index');
    }

    public function webhooks()
    {
        return Inertia::render('webhooks/index');
    }

    public function mediaLibrary()
    {
        return Inertia::render('media-library-demo');
    }

    public function chatGptDemo()
    {
        return Inertia::render('examples/chatgpt-demo');
    }
}
