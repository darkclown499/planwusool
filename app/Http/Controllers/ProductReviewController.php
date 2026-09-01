<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductReview;
use App\Services\LoyaltyService;
use App\Services\MerchantNotificationService;
use App\Services\ProductReviewService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProductReviewController extends Controller
{
    protected $loyaltyService;

    protected $reviewService;

    public function __construct(LoyaltyService $loyaltyService, ProductReviewService $reviewService)
    {
        $this->loyaltyService = $loyaltyService;
        $this->reviewService = $reviewService;
    }

    /**
     * Display a listing of reviews for the store admin.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = (int) $user->current_store;

        $query = ProductReview::where('store_id', $currentStoreId)
            ->with(['product:id,name', 'customer:id,first_name,last_name,email']);

        // Apply filters
        if ($request->has('rating') && $request->rating !== 'all') {
            $query->where('rating', $request->rating);
        }
        if ($request->has('status') && $request->status !== 'all') {
            switch ($request->status) {
                case 'approved':
                    $query->visible();
                    break;
                case 'rejected':
                    $query->where('is_rejected', true);
                    break;
                case 'hidden':
                    $query->whereNotNull('hide_reason');
                    break;
                case 'needs-response':
                    $query->visible();
                    $query->whereNull('admin_reply');
                    break;
                default: // pending
                    $query->where('is_approved', false)->where('is_rejected', false)->whereNull('hide_reason');
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

        // Statistics — visible reviews drive aggregates; hidden/rejected/pending excluded.
        $base = ProductReview::where('store_id', $currentStoreId);
        $visible = ProductReview::where('store_id', $currentStoreId)->visible();

        $stats = [
            'total' => (clone $base)->count(),
            'approved' => (clone $visible)->count(),
            'pending' => (clone $base)->where('is_approved', false)->where('is_rejected', false)->whereNull('hide_reason')->count(),
            'rejected' => (clone $base)->where('is_rejected', true)->count(),
            'hidden' => (clone $base)->whereNotNull('hide_reason')->count(),
            'needs_response' => (clone $visible)->whereNull('admin_reply')->count(),
            'average_rating' => (float) (clone $visible)->avg('rating') ?? 0,
            'rating_distribution' => [
                5 => (clone $visible)->where('rating', 5)->count(),
                4 => (clone $visible)->where('rating', 4)->count(),
                3 => (clone $visible)->where('rating', 3)->count(),
                2 => (clone $visible)->where('rating', 2)->count(),
                1 => (clone $visible)->where('rating', 1)->count(),
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
     *
     * Phase 1 hardening:
     * - Guests are blocked (verified-purchase only).
     * - Verified badge is server-computed from a real order + line item that
     *   belongs to the authenticated customer, the same store, and contains the
     *   product. The client cannot forge it.
     * - One review per (store, product, customer) — edits update in place.
     * - Valid verified reviews auto-publish (Option A); merchants hide with a
     *   required reason afterwards.
     */
    public function store(Request $request)
    {
        $customer = Auth::guard('customer')->user();
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'سجّل الدخول لتقييم المنتج الذي اشتريته.'], 401);
        }

        $request->validate([
            'product_id' => 'required|exists:products,id',
            'store_id' => 'required|exists:stores,id',
            'order_id' => 'required|exists:orders,id',
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'nullable|string|max:255',
            'comment' => 'nullable|string|max:5000',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        // Store isolation: product must belong to store_id
        $product = Product::find($request->product_id);
        if (!$product || (int) $product->store_id !== (int) $request->store_id) {
            return response()->json(['success' => false, 'message' => 'المنتج لا ينتمي إلى هذا المتجر.'], 422);
        }
        if (!$product->is_active || ($product->category && !$product->category->is_active)) {
            return response()->json(['success' => false, 'message' => 'المنتج غير متاح.'], 422);
        }

        // Server-authoritative eligibility + verified purchase determination.
        $eligibility = $this->reviewService->eligibility(
            $product,
            (int) $customer->id,
            $request->integer('order_id')
        );
        if (!$eligibility['eligible']) {
            return response()->json(['success' => false, 'message' => $eligibility['message']], 403);
        }

        // Handle image uploads (legacy media reviews — kept as-is).
        $uploadedImages = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('review-images', 'public');
                $uploadedImages[] = $path;
            }
        }

        $data = [
            'product_id' => $request->product_id,
            'store_id' => $request->store_id,
            'customer_id' => (int) $customer->id,
            'order_id' => $eligibility['order']->id,
            'order_item_id' => $eligibility['orderItem']->id,
            'rating' => (int) $request->rating,
            'title' => $this->reviewService->sanitizeText($request->title, 255),
            'comment' => $this->reviewService->sanitizeText($request->comment, 5000),
            'images' => $uploadedImages,
            'is_approved' => true, // Option A: valid verified reviews auto-publish.
            'is_rejected' => false,
            'hide_reason' => null,
            'is_verified_purchase' => true,
        ];

        // One review per (store, product, customer) — update in place.
        $existing = $this->reviewService->existingReview(
            (int) $product->store_id,
            (int) $product->id,
            (int) $customer->id
        );

        $created = false;
        if ($existing) {
            $existing->fill($data)->save();
            $review = $existing;
        } else {
            $review = ProductReview::create($data);
            $created = true;
        }

        if ($created) {
            MerchantNotificationService::newReview($review);
            $this->loyaltyService->awardReviewBonus($customer);
        }

        return response()->json([
            'success' => true,
            'message' => $existing ? 'تم تحديث تقييمك.' : 'تم نشر تقييمك، شكراً لتعليقك.',
            'updated' => !$created,
            'review' => $this->serializePublicReview($review),
        ]);
    }

    /**
     * API: Get reviews for a product (public). Store isolation enforced.
     */
    public function productReviews(Request $request, $productId)
    {
        $product = Product::find($productId);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found'], 404);
        }
        if ($request->filled('store_id') && (int) $request->store_id !== (int) $product->store_id) {
            return response()->json(['success' => false, 'message' => 'Product does not belong to this store'], 403);
        }

        $reviews = ProductReview::where('product_id', $productId)
            ->where('store_id', $product->store_id)
            ->visible()
            ->with('customer:id,first_name,last_name')
            ->latest()
            ->paginate($request->get('per_page', 10));

        // Mask PII — the public endpoint never exposes email/full last name.
        $reviews->getCollection()->transform(function ($review) {
            return $this->serializePublicReview($review);
        });

        $stats = $this->publicStats((int) $product->store_id, (int) $productId);

        return response()->json([
            'success' => true,
            'reviews' => $reviews,
            'stats' => $stats,
        ]);
    }

    /**
     * Approve a review (legacy moderation + re-publication path).
     */
    public function approve(ProductReview $review)
    {
        $this->authorizeStore($review);

        $review->update(['is_approved' => true, 'is_rejected' => false, 'hide_reason' => null]);

        return redirect()->back()->with('success', __('Review approved successfully!'));
    }

    /**
     * Reject a review (legacy moderation path).
     */
    public function reject(ProductReview $review)
    {
        $this->authorizeStore($review);

        $review->update(['is_rejected' => true, 'is_approved' => false, 'hide_reason' => null]);

        return redirect()->back()->with('success', __('Review rejected successfully!'));
    }

    /**
     * Hide a live review with a required reason (Option A moderation).
     */
    public function hide(Request $request, ProductReview $review)
    {
        $this->authorizeStore($review);

        $request->validate([
            'hide_reason' => ['required', 'string', 'max:50', 'in:' . implode(',', ProductReview::HIDE_REASONS)],
        ]);

        $review->update([
            'hide_reason' => $request->hide_reason,
            'is_approved' => false,
            'is_rejected' => false,
        ]);

        return redirect()->back()->with('success', __('Review hidden successfully!'));
    }

    /**
     * Un-hide a review — restores it to the live publishing state.
     */
    public function show(ProductReview $review)
    {
        $this->authorizeStore($review);

        $review->update([
            'hide_reason' => null,
            'is_rejected' => false,
            'is_approved' => true,
        ]);

        return redirect()->back()->with('success', __('Review published successfully!'));
    }

    /**
     * Reply to a review.
     */
    public function reply(Request $request, ProductReview $review)
    {
        $this->authorizeStore($review);

        $request->validate([
            'admin_reply' => 'required|string|max:2000',
        ]);

        $review->update([
            'admin_reply' => $this->reviewService->sanitizeText($request->admin_reply, 2000),
            'merchant_replied_at' => now(),
        ]);

        return redirect()->back()->with('success', __('Reply added successfully!'));
    }

    /**
     * Remove the specified review.
     */
    public function destroy(ProductReview $review)
    {
        $this->authorizeStore($review);

        $review->delete();

        return redirect()->route('product-reviews.index')->with('success', __('Review deleted successfully!'));
    }

    /**
     * Export reviews data as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        $currentStoreId = (int) $user->current_store;

        $reviews = ProductReview::where('store_id', $currentStoreId)
            ->with(['product:id,name', 'customer:id,first_name,last_name,email'])
            ->orderBy('created_at', 'desc')
            ->get();

        $csvData = [];
        $csvData[] = ['Product', 'Customer', 'Rating', 'Title', 'Comment', 'Status', 'Verified Purchase', 'Hide Reason', 'Date'];

        foreach ($reviews as $review) {
            $csvData[] = [
                $review->product->name ?? 'N/A',
                $review->customer->full_name ?? 'N/A',
                $review->rating . ' ★',
                $review->title ?? '',
                $review->comment ?? '',
                $review->status,
                $review->is_verified_purchase ? 'Yes' : 'No',
                $review->hide_reason ?? '',
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

    /**
     * Single-query aggregates for one product, visible reviews only.
     */
    protected function publicStats(int $storeId, int $productId): array
    {
        $stats = ProductReview::statsForProducts($storeId, [$productId]);
        $stats = $stats[$productId] ?? null;

        $distribution = $stats['rating_distribution'] ?? [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];

        return [
            'average_rating' => (float) ($stats['average_rating'] ?? 0),
            'total_reviews' => (int) ($stats['review_count'] ?? 0),
            'rating_distribution' => $distribution,
        ];
    }

    /**
     * Review shape sent to the public storefront (PII masked, no email).
     */
    protected function serializePublicReview(ProductReview $review): array
    {
        $customer = $review->relationLoaded('customer')
            ? $review->customer
            : $review->customer()->first();

        $publicCustomer = $customer
            ? $this->reviewService->publicCustomer($customer)
            : ['display_name' => 'Customer', 'initials' => 'C', 'first_name' => ''];

        return [
            'id' => $review->id,
            'rating' => (int) $review->rating,
            'title' => $review->title,
            'comment' => $review->comment,
            'images' => $review->images ?: [],
            'is_verified_purchase' => (bool) $review->is_verified_purchase,
            'admin_reply' => $review->admin_reply,
            'created_at' => $review->created_at?->toIso8601String(),
            'customer' => $publicCustomer,
        ];
    }

    /**
     * Tenancy guard used by every merchant mutation.
     */
    protected function authorizeStore(ProductReview $review): void
    {
        $user = Auth::user();
        $currentStoreId = (int) $user->current_store;

        if ((int) $review->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }
    }
}