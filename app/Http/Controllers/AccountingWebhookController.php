<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Services\AccountingService;
use Illuminate\Http\Request;

class AccountingWebhookController extends Controller
{
    protected AccountingService $accountingService;

    public function __construct(AccountingService $accountingService)
    {
        $this->accountingService = $accountingService;
    }

    public function handle(Request $request, Store $store)
    {
        $result = $this->accountingService->handleWebhook($request, $store);

        if (!$result['success']) {
            return response()->json($result, 400);
        }

        return response()->json($result);
    }
}
