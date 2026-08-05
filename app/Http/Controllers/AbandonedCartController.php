<?php

namespace App\Http\Controllers;

use App\Models\AbandonedCart;
use App\Services\AbandonedCartService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AbandonedCartController extends Controller
{
    protected $abandonedCartService;

    public function __construct(AbandonedCartService $abandonedCartService)
    {
        $this->abandonedCartService = $abandonedCartService;
    }

    /**
     * Display a listing of abandoned carts.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $query = AbandonedCart::where('store_id', $currentStoreId);

        // Apply filters
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('last_activity_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('last_activity_at', '<=', $request->date_to);
        }

        $perPage = $request->get('per_page', 15);
        $carts = $query->latest('last_activity_at')->paginate($perPage);

        $stats = $currentStoreId ? $this->abandonedCartService->getStats($currentStoreId) : [];

        return Inertia::render('abandoned-carts/index', [
            'carts' => $carts,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'per_page']),
            'stats' => $stats,
        ]);
    }

    /**
     * Send a manual reminder for a specific abandoned cart.
     */
    public function sendReminder(AbandonedCart $abandonedCart)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($abandonedCart->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $this->abandonedCartService->sendReminder($abandonedCart);

        return redirect()->back()->with('success', __('Reminder sent successfully!'));
    }

    /**
     * Mark an abandoned cart as recovered manually.
     */
    public function markRecovered(AbandonedCart $abandonedCart)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($abandonedCart->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $abandonedCart->update([
            'status' => 'recovered',
            'recovered_at' => now(),
        ]);

        return redirect()->back()->with('success', __('Cart marked as recovered!'));
    }

    /**
     * Remove the specified abandoned cart.
     */
    public function destroy(AbandonedCart $abandonedCart)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($abandonedCart->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $abandonedCart->delete();

        return redirect()->route('abandoned-carts.index')->with('success', __('Cart deleted successfully!'));
    }

    /**
     * Export abandoned carts data as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $carts = AbandonedCart::where('store_id', $currentStoreId)
            ->orderBy('last_activity_at', 'desc')
            ->get();

        $csvData = [];
        $csvData[] = ['Customer Name', 'Email', 'Phone', 'Cart Total', 'Status', 'Items Count', 'Reminders Sent', 'Last Activity', 'Recovered At'];

        foreach ($carts as $cart) {
            $items = is_array($cart->cart_items) ? $cart->cart_items : [];
            $csvData[] = [
                $cart->customer_name ?? 'N/A',
                $cart->customer_email ?? 'N/A',
                $cart->customer_phone ?? 'N/A',
                number_format($cart->cart_total, 2),
                ucfirst($cart->status),
                count($items),
                $cart->reminder_count,
                $cart->last_activity_at ? $cart->last_activity_at->format('Y-m-d H:i:s') : 'N/A',
                $cart->recovered_at ? $cart->recovered_at->format('Y-m-d H:i:s') : 'N/A',
            ];
        }

        $filename = 'abandoned-carts-export-' . now()->format('Y-m-d') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
