<?php

namespace App\Http\Controllers;

use App\Models\ExpressCheckout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ExpressCheckoutController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        $checkouts = ExpressCheckout::where('store_id', $currentStoreId)
            ->orderBy('created_at', 'desc')
            ->get();
            
        // Get statistics
        $totalCheckouts = ExpressCheckout::where('store_id', $currentStoreId)->count();
        $activeCheckouts = ExpressCheckout::where('store_id', $currentStoreId)->where('is_active', true)->count();
        $totalConversions = ExpressCheckout::where('store_id', $currentStoreId)->sum('conversions');
        $totalRevenue = ExpressCheckout::where('store_id', $currentStoreId)->sum('revenue');
        
        // Calculate conversion rate
        $conversionRate = 0;
        if ($totalConversions > 0) {
            // This is a placeholder - in a real implementation, this would be calculated
            // based on actual data like visits vs. conversions
            $conversionRate = 23.5;
        }

        return Inertia::render('express-checkout/index', [
            'checkouts' => $checkouts,
            'stats' => [
                'total' => $totalCheckouts,
                'active' => $activeCheckouts,
                'conversionRate' => $conversionRate,
                'totalRevenue' => $totalRevenue
            ]
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('express-checkout/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'description' => 'nullable|string',
            'button_text' => 'nullable|string|max:50',
            'button_color' => 'nullable|string|max:20',
            'is_active' => 'boolean',
            'payment_methods' => 'nullable|array',
            'default_payment_method' => 'nullable|string|max:50',
            'skip_cart' => 'boolean',
            'auto_fill_customer_data' => 'boolean',
            'guest_checkout_allowed' => 'boolean',
            'mobile_optimized' => 'boolean',
            'save_payment_methods' => 'boolean',
            'success_redirect_url' => 'nullable|string|max:255',
            'cancel_redirect_url' => 'nullable|string|max:255',
        ], [], [
            'name' => __('Checkout Name'),
            'type' => __('Checkout Type'),
            'description' => __('Description'),
            'button_text' => __('Button Text'),
            'button_color' => __('Button Color'),
            'default_payment_method' => __('Default Payment Method'),
            'success_redirect_url' => __('Success Redirect URL'),
            'cancel_redirect_url' => __('Cancel Redirect URL'),
        ]);

        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $checkout = ExpressCheckout::create([
            'store_id' => $currentStoreId,
            'name' => $request->name,
            'type' => $request->type,
            'description' => $request->description,
            'button_text' => $request->button_text ?? 'Buy Now',
            'button_color' => $request->button_color ?? '#000000',
            'is_active' => $request->is_active ?? true,
            'payment_methods' => $request->payment_methods,
            'default_payment_method' => $request->default_payment_method,
            'skip_cart' => $request->skip_cart ?? true,
            'auto_fill_customer_data' => $request->auto_fill_customer_data ?? true,
            'guest_checkout_allowed' => $request->guest_checkout_allowed ?? false,
            'mobile_optimized' => $request->mobile_optimized ?? true,
            'save_payment_methods' => $request->save_payment_methods ?? false,
            'success_redirect_url' => $request->success_redirect_url,
            'cancel_redirect_url' => $request->cancel_redirect_url,
        ]);

        return redirect()->route('express-checkout.index')
            ->with('success', 'Express checkout created successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        $checkout = ExpressCheckout::where('store_id', $currentStoreId)
            ->findOrFail($id);
        
        // Add conversion rate using model accessor
        $checkout->append('conversion_rate');
        
        // Get recent transactions (placeholder)
        $recentTransactions = [
            [
                'id' => '#TXN-001',
                'customer' => 'John Doe',
                'amount' => 89.99,
                'method' => 'Credit Card',
                'date' => '2024-01-15'
            ],
            [
                'id' => '#TXN-002',
                'customer' => 'Jane Smith',
                'amount' => 156.50,
                'method' => 'PayPal',
                'date' => '2024-01-14'
            ],
            [
                'id' => '#TXN-003',
                'customer' => 'Mike Johnson',
                'amount' => 234.00,
                'method' => 'Credit Card',
                'date' => '2024-01-13'
            ]
        ];
        
        // Format transaction amounts for display
        foreach ($recentTransactions as &$transaction) {
            $transaction['formatted_amount'] = formatStoreCurrency($transaction['amount'], $user->id, $currentStoreId);
        }
        
        return Inertia::render('express-checkout/show', [
            'checkout' => $checkout,
            'recentTransactions' => $recentTransactions
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        $checkout = ExpressCheckout::where('store_id', $currentStoreId)
            ->findOrFail($id);
        
        return Inertia::render('express-checkout/edit', [
            'checkout' => $checkout
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'description' => 'nullable|string',
            'button_text' => 'nullable|string|max:50',
            'button_color' => 'nullable|string|max:20',
            'is_active' => 'boolean',
            'payment_methods' => 'nullable|array',
            'default_payment_method' => 'nullable|string|max:50',
            'skip_cart' => 'boolean',
            'auto_fill_customer_data' => 'boolean',
            'guest_checkout_allowed' => 'boolean',
            'mobile_optimized' => 'boolean',
            'save_payment_methods' => 'boolean',
            'success_redirect_url' => 'nullable|string|max:255',
            'cancel_redirect_url' => 'nullable|string|max:255',
        ], [], [
            'name' => __('Checkout Name'),
            'type' => __('Checkout Type'),
            'description' => __('Description'),
            'button_text' => __('Button Text'),
            'button_color' => __('Button Color'),
            'default_payment_method' => __('Default Payment Method'),
            'success_redirect_url' => __('Success Redirect URL'),
            'cancel_redirect_url' => __('Cancel Redirect URL'),
        ]);

        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        $checkout = ExpressCheckout::where('store_id', $currentStoreId)
            ->findOrFail($id);
        
        $checkout->update([
            'name' => $request->name,
            'type' => $request->type,
            'description' => $request->description,
            'button_text' => $request->button_text,
            'button_color' => $request->button_color,
            'is_active' => $request->is_active,
            'payment_methods' => $request->payment_methods,
            'default_payment_method' => $request->default_payment_method,
            'skip_cart' => $request->skip_cart,
            'auto_fill_customer_data' => $request->auto_fill_customer_data,
            'guest_checkout_allowed' => $request->guest_checkout_allowed,
            'mobile_optimized' => $request->mobile_optimized,
            'save_payment_methods' => $request->save_payment_methods,
            'success_redirect_url' => $request->success_redirect_url,
            'cancel_redirect_url' => $request->cancel_redirect_url,
        ]);

        return redirect()->route('express-checkout.index')
            ->with('success', 'Express checkout updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        $checkout = ExpressCheckout::where('store_id', $currentStoreId)
            ->findOrFail($id);
        
        $checkout->delete();

        return redirect()->route('express-checkout.index')
            ->with('success', 'Express checkout deleted successfully!');
    }
}