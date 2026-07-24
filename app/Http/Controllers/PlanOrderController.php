<?php

namespace App\Http\Controllers;

use App\Models\PlanOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PlanOrderController extends BaseController
{
    public function index(Request $request)
    {
        $user = Auth::user();
        
        // Check permissions - use permission-based access
        if (!$user->hasPermissionTo('manage-plan-orders')) {
            abort(403, 'Unauthorized Access Prevented');
        }
        
        $query = PlanOrder::with(['user', 'plan', 'coupon', 'processedBy']);
        
        // Filter by company data if not superadmin
        if (!$user->hasPermissionTo('approve-plan-orders')) {
            // Get company ID - either current user if company, or creator if company user
            $companyId = $user->type === 'company' ? $user->id : $user->created_by;
            
            // Get all users in this company (company + company users)
            $companyUserIds = \App\Models\User::where(function($q) use ($companyId) {
                $q->where('id', $companyId) // Company user
                  ->orWhere('created_by', $companyId); // Company's users
            })->pluck('id');
            
            $query->whereIn('user_id', $companyUserIds);
        }

        // Apply search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($userQuery) use ($search) {
                      $userQuery->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('plan', function ($planQuery) use ($search) {
                      $planQuery->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Apply filters
        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        // Apply sorting
        $sortBy = $request->get('sort_by', 'ordered_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 10);
        $planOrders = $query->paginate($perPage);
        
        // Add formatted prices using superadmin currency settings
        $planOrders->getCollection()->transform(function ($order) {
            $order->formatted_original_price = formatCurrencyAmount($order->original_price);
            $order->formatted_discount_amount = formatCurrencyAmount($order->discount_amount);
            $order->formatted_final_price = formatCurrencyAmount($order->final_price);
            return $order;
        });

        return Inertia::render('plans/plan-orders', [
            'planOrders' => $planOrders,
            'filters' => $request->only(['search', 'status', 'sort_by', 'sort_order', 'per_page'])
        ]);
    }

    public function approve(PlanOrder $planOrder)
    {
        try {
            $planOrder->approve(Auth::id());
            
            return redirect()->route('plan-orders.index')
                ->with('success', __('Plan order approved successfully!'));
        } catch (\Exception $e) {
            return redirect()->route('plan-orders.index')
                ->with('error', __('Failed to approve plan order: ') . $e->getMessage());
        }
    }

    public function reject(Request $request, PlanOrder $planOrder)
    {
        try {
            $request->validate([
                'notes' => 'nullable|string|max:500'
            ]);

            $planOrder->reject(Auth::id(), $request->notes);
            
            return redirect()->route('plan-orders.index')
                ->with('success', __('Plan order rejected successfully!'));
        } catch (\Exception $e) {
            return redirect()->route('plan-orders.index')
                ->with('error', __('Failed to reject plan order: ') . $e->getMessage());
        }
    }
}
