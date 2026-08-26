<?php

namespace App\Http\Controllers;

use App\Models\ProductReview;
use App\Models\Product;
use App\Models\Order;
use App\Models\Customer;
use App\Services\LoyaltyService;
use App\Services\MerchantNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProductReviewController extends Controller
{
    protected $loyaltyService;

    public function __construct(LoyaltyService $loyaltyService)
    {
        $this->loyaltyService = $loyaltyService;
    }

    /**
     * Display a listing of reviews for the store admin.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $query = ProductReview::where('store_id', $currentStoreId)
            ->with(['product:id,name', 'customer:id,first_name,last_name,email']);

        // Apply filters
        if ($request->has('rating') && $request->rating !== 'all') {
            $query->where('rating', $request->rating);
        }
        if ($request->has('status') && $request->status !== 'all') {
            if ($request->status === 'approved') {
                $query->where('is_approved', true);
            } elseif ($request->status === 'rejected') {
                $query->where('is_rejected', true);
            } else {
                $query->where('is_approved', false)->where('is_rejected', false);
            }
        }
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('product', function ($pq) use ($search) {
                    $pq->where('name', 'like', "%{$search}%");
                })
                    ->orWhere('comment', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = $request->get('per_page', 10);
        $reviews = $query->latest()->paginate($perPage);

        // Get statistics
        $stats = [
            'total' => ProductReview::where('store_id', $currentStoreId)->count(),
            'approved' => ProductReview::where('store_id', $currentStoreId)->where('is_approved', true)->count(),
            'pending' => ProductReview::where('store_id', $currentStoreId)->where('is_approved', false)->where('is_rejected', false)->count(),
            'rejected' => ProductReview::where('store_id', $currentStoreId)->where('is_rejected', true)->count(),
            'average_rating' => (float) ProductReview::where('store_id', $currentStoreId)->where('is_approved', true)->avg('rating') ?? 0,
            'rating_distribution' => [
                5 => ProductReview::where('store_id', $currentStoreId)->where('rating', 5)->count(),
                4 => ProductReview::where('store_id', $currentStoreId)->where('rating', 4)->count(),
                3 => ProductReview::where('store_id', $currentStoreId)->where('rating', 3)->count(),
                2 => ProductReview::where('store_id', $currentStoreId)->where('rating', 2)->count(),
                1 => ProductReview::where('store_id', $currentStoreId)->where('rating', 1)->count(),
            ],
        ];

        return Inertia::render('product-reviews/index', [
            'reviews' => $reviews,
            'filters' => $request->only(['search', 'rating', 'status', 'per_page']),
            'stats' => $stats,
        ]);
    }

    /**
     * Store a new review (API - from customer on storefront).
     */
    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'store_id' => 'required|exists:stores,id',
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'nullable|string|max:255',
            'comment' => 'nullable|string|max:5000',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'order_id' => 'nullable|exists:orders,id',
        ]);

        // Store isolation: product must belong to store_id
        $product = Product::find($request->product_id);
        if (!$product || (int) $product->store_id !== (int) $request->store_id) {
            return response()->json(['success' => false, 'message' => 'Product does not belong to this store'], 422);
        }
        if (!$product->is_active || ($product->category && !$product->category->is_active)) {
            return response()->json(['success' => false, 'message' => 'Product not available'], 422);
        }

        // Check if customer can review this product for the given order
        $customerId = Auth::guard('customer')->id();
        $orderId = $request->order_id;

        if ($orderId) {
            $order = Order::find($orderId);
            if (!$order || $order->customer_id !== $customerId) {
                return response()->json(['success' => false, 'message' => 'Invalid order'], 403);
            }

            // Check if already reviewed
            $existingReview = ProductReview::where('product_id', $request->product_id)
                ->where('order_id', $orderId)
                ->where('customer_id', $customerId)
                ->first();

            if ($existingReview) {
                return response()->json(['success' => false, 'message' => 'You have already reviewed this product for this order'], 400);
            }
        }

        // Handle image uploads
        $uploadedImages = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('review-images', 'public');
                $uploadedImages[] = $path;
            }
        }

        $review = ProductReview::create([
            'product_id' => $request->product_id,
            'store_id' => $request->store_id,
            'customer_id' => $customerId,
            'order_id' => $orderId,
            'rating' => $request->rating,
            'title' => $request->title,
            'comment' => $request->comment,
            'images' => $uploadedImages,
            'is_approved' => false, // Requires admin approval by default
            'is_verified_purchase' => $orderId ? true : false,
        ]);

        // Notify the store owner about the new review
        MerchantNotificationService::newReview($review);

        // Award review bonus points
        if ($customerId) {
            $customer = Customer::find($customerId);
            if ($customer) {
                $this->loyaltyService->awardReviewBonus($customer);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Review submitted successfully',
            'review' => $review->load('customer:id,first_name,last_name'),
        ]);
    }

    /**
     * API: Get reviews for a product (public). Store isolation enforced.
     */
    public function productReviews(Request $request, $productId)
    {
        // Enforce store isolation: product must belong to requested store (if store_id provided) or we resolve it
        $product = Product::find($productId);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found'], 404);
        }
        // If store_id supplied, reject cross-store leak
        if ($request->filled('store_id') && (int) $request->store_id !== (int) $product->store_id) {
            return response()->json(['success' => false, 'message' => 'Product does not belong to this store'], 403);
        }

        $reviews = ProductReview::where('product_id', $productId)
            ->where('store_id', $product->store_id)
            ->approved()
            ->with('customer:id,first_name,last_name,avatar')
            ->latest()
            ->paginate($request->get('per_page', 10));

        $stats = [
            'average_rating' => ProductReview::averageRatingFor((int) $productId),
            'total_reviews' => ProductReview::countFor((int) $productId),
            'rating_distribution' => [
                5 => ProductReview::where('product_id', $productId)->where('rating', 5)->count(),
                4 => ProductReview::where('product_id', $productId)->where('rating', 4)->count(),
                3 => ProductReview::where('product_id', $productId)->where('rating', 3)->count(),
                2 => ProductReview::where('product_id', $productId)->where('rating', 2)->count(),
                1 => ProductReview::where('product_id', $productId)->where('rating', 1)->count(),
            ],
        ];

        return response()->json([
            'success' => true,
            'reviews' => $reviews,
            'stats' => $stats,
        ]);
    }

    /**
     * Approve a review.
     */
    public function approve(ProductReview $review)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($review->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $review->update(['is_approved' => true, 'is_rejected' => false]);

        return redirect()->back()->with('success', __('Review approved successfully!'));
    }

    /**
     * Reject a review.
     */
    public function reject(ProductReview $review)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($review->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $review->update(['is_rejected' => true, 'is_approved' => false]);

        return redirect()->back()->with('success', __('Review rejected successfully!'));
    }

    /**
     * Reply to a review.
     */
    public function reply(Request $request, ProductReview $review)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($review->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'admin_reply' => 'required|string|max:2000',
        ]);

        $review->update([
            'admin_reply' => $request->admin_reply,
        ]);

        return redirect()->back()->with('success', __('Reply added successfully!'));
    }

    /**
     * Remove the specified review.
     */
    public function destroy(ProductReview $review)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($review->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $review->delete();

        return redirect()->route('product-reviews.index')->with('success', __('Review deleted successfully!'));
    }

    /**
     * Export reviews data as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $reviews = ProductReview::where('store_id', $currentStoreId)
            ->with(['product:id,name', 'customer:id,first_name,last_name,email'])
            ->orderBy('created_at', 'desc')
            ->get();

        $csvData = [];
        $csvData[] = ['Product', 'Customer', 'Rating', 'Title', 'Comment', 'Status', 'Date'];

        foreach ($reviews as $review) {
            $csvData[] = [
                $review->product->name ?? 'N/A',
                $review->customer->full_name ?? 'N/A',
                $review->rating . ' ★',
                $review->title ?? '',
                $review->comment ?? '',
                $review->is_approved ? 'Approved' : ($review->is_rejected ? 'Rejected' : 'Pending'),
                $review->created_at->format('Y-m-d H:i:s'),
            ];
        }

        $filename = 'product-reviews-export-' . now()->format('Y-m-d') . '.csv';

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
