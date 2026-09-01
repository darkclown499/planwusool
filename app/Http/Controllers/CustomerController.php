<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerNote;
use App\Models\CustomerTag;
use App\Services\CustomerDirectoryService;
use App\Services\CustomerIdentityService;
use App\Services\CustomerProfileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CustomerController extends Controller
{
    /**
     * Display the merchant customer directory (search + filters + pagination).
     * Returns BOTH canonical registered customers and aggregated guest identities.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);

        $directory = app(CustomerDirectoryService::class)->directory(
            (int) $currentStoreId,
            $request->only(['search', 'filter', 'per_page', 'page', 'dormant_days'])
        );

        return Inertia::render('customers/index', $directory);
    }

    /**
     * Customer 360 profile — resolved by a signed URL-safe token so raw
     * phone/email never appear in the address bar. Works for both canonical
     * and guest identities, and is always tenant-scoped by store.
     *
     * Keeps the legacy canonical ``customers.show`` (by numeric id) working via
     * a redirect. Direct id substitution across stores is rejected (404).
     */
    public function profile(string $token)
    {
        $user = Auth::user();
        $storeId = (int) getCurrentStoreId($user);

        $ref = app(CustomerIdentityService::class)->refFromToken($token);
        if ($ref === null) {
            abort(404);
        }

        $profile = app(CustomerProfileService::class)->profileForRef($storeId, $ref);

        return Inertia::render('customers/show', [
            'profile' => $profile,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('customers/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other,prefer_not_to_say',
            'notes' => 'nullable|string',
            'avatar' => 'nullable|string',
            'is_active' => 'boolean',
            'preferred_language' => 'nullable|string|max:10',
            'customer_group' => 'nullable|string|max:50',
            'email_marketing' => 'boolean',
            'sms_notifications' => 'boolean',
            'order_updates' => 'boolean',
            'billing_address' => 'nullable|array',
            'shipping_address' => 'nullable|array',
            'same_as_billing' => 'boolean'
        ], [], [
            'first_name' => __('First Name'),
            'last_name' => __('Last Name'),
            'email' => __('Email Address'),
        ]);

        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);

        $existingCustomer = Customer::where('store_id', $currentStoreId)
            ->where('email', $request->email)
            ->first();

        if ($existingCustomer) {
            return back()->with('error', __('A customer with this email already exists.'));
        }

        $customer = Customer::create([
            'store_id' => $currentStoreId,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'date_of_birth' => $request->date_of_birth,
            'gender' => $request->gender,
            'notes' => $request->notes,
            'avatar' => $request->avatar,
            'is_active' => $request->is_active,
            'preferred_language' => $request->preferred_language ?? 'ar',
            'customer_group' => $request->customer_group ?? 'regular',
            'email_marketing' => $request->email_marketing,
            'sms_notifications' => $request->sms_notifications,
            'order_updates' => $request->order_updates
        ]);

        if ($request->billing_address) {
            $billingAddress = $request->billing_address;
            CustomerAddress::create([
                'customer_id' => $customer->id,
                'type' => 'billing',
                'address' => $billingAddress['address'] ?? '',
                'city' => $billingAddress['city'] ?? '',
                'state' => $billingAddress['state'] ?? '',
                'postal_code' => $billingAddress['postal_code'] ?? '',
                'country' => $billingAddress['country'] ?? '',
                'is_default' => true
            ]);
        }

        if ($request->shipping_address && !$request->same_as_billing) {
            $shippingAddress = $request->shipping_address;
            CustomerAddress::create([
                'customer_id' => $customer->id,
                'type' => 'shipping',
                'address' => $shippingAddress['address'] ?? '',
                'city' => $shippingAddress['city'] ?? '',
                'state' => $shippingAddress['state'] ?? '',
                'postal_code' => $shippingAddress['postal_code'] ?? '',
                'country' => $shippingAddress['country'] ?? '',
                'is_default' => true
            ]);
        } elseif ($request->same_as_billing && $request->billing_address) {
            $billingAddress = $request->billing_address;
            CustomerAddress::create([
                'customer_id' => $customer->id,
                'type' => 'shipping',
                'address' => $billingAddress['address'] ?? '',
                'city' => $billingAddress['city'] ?? '',
                'state' => $billingAddress['state'] ?? '',
                'postal_code' => $billingAddress['postal_code'] ?? '',
                'country' => $billingAddress['country'] ?? '',
                'is_default' => true
            ]);
        }

        return redirect()->route('customers.index')
            ->with('success', __('Customer created successfully!'));
    }

    /**
     * Legacy canonical customer detail by numeric id — kept for backward
     * compatibility. Redirects to the token-based CRM profile so the UI always
     * uses one canonical 360 route. Tenant-scoped with 404 on cross-store id.
     */
    public function show($id)
    {
        $user = Auth::user();
        $currentStoreId = (int) getCurrentStoreId($user);

        $customer = Customer::where('store_id', $currentStoreId)->find((int) $id);
        if (! $customer) {
            abort(404);
        }

        $ref = app(CustomerIdentityService::class)->refForCanonical($customer->id);
        $token = app(CustomerIdentityService::class)->tokenForRef($ref);

        return redirect()->route('customers.profile', $token);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);

        $customer = Customer::where('store_id', $currentStoreId)
            ->with(['addresses'])
            ->findOrFail($id);

        $customer = sanitizeModelUtf8($customer);

        $billingAddress = $customer->addresses->where('type', 'billing')->first();
        $shippingAddress = $customer->addresses->where('type', 'shipping')->first();

        return Inertia::render('customers/edit', [
            'customer' => $customer,
            'billingAddress' => $billingAddress ? sanitizeModelUtf8($billingAddress) : null,
            'shippingAddress' => $shippingAddress ? sanitizeModelUtf8($shippingAddress) : null,
            'sameAsBilling' => $billingAddress && $shippingAddress &&
                $billingAddress->address === $shippingAddress->address &&
                $billingAddress->city === $shippingAddress->city &&
                $billingAddress->postal_code === $shippingAddress->postal_code
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other,prefer_not_to_say',
            'notes' => 'nullable|string',
            'avatar' => 'nullable|string',
            'is_active' => 'boolean',
            'preferred_language' => 'nullable|string|max:10',
            'customer_group' => 'nullable|string|max:50',
            'email_marketing' => 'boolean',
            'sms_notifications' => 'boolean',
            'order_updates' => 'boolean',
            'billing_address' => 'nullable|array',
            'shipping_address' => 'nullable|array',
            'same_as_billing' => 'boolean'
        ], [], [
            'first_name' => __('First Name'),
            'last_name' => __('Last Name'),
            'email' => __('Email Address'),
        ]);

        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);

        $customer = Customer::where('store_id', $currentStoreId)->findOrFail($id);

        $existingCustomer = Customer::where('store_id', $currentStoreId)
            ->where('email', $request->email)
            ->where('id', '!=', $id)
            ->first();

        if ($existingCustomer) {
            return back()->with('error', __('A customer with this email already exists.'));
        }

        $customer->update([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'date_of_birth' => $request->date_of_birth,
            'gender' => $request->gender,
            'notes' => $request->notes,
            'avatar' => $request->avatar,
            'is_active' => $request->is_active,
            'preferred_language' => $request->preferred_language ?? 'ar',
            'customer_group' => $request->customer_group ?? 'regular',
            'email_marketing' => $request->email_marketing,
            'sms_notifications' => $request->sms_notifications,
            'order_updates' => $request->order_updates
        ]);

        if ($request->billing_address) {
            $billingAddress = $request->billing_address;
            CustomerAddress::updateOrCreate(
                [
                    'customer_id' => $customer->id,
                    'type' => 'billing',
                    'is_default' => true
                ],
                [
                    'address' => $billingAddress['address'] ?? '',
                    'city' => $billingAddress['city'] ?? '',
                    'state' => $billingAddress['state'] ?? '',
                    'postal_code' => $billingAddress['postal_code'] ?? '',
                    'country' => $billingAddress['country'] ?? ''
                ]
            );
        }

        if ($request->shipping_address && !$request->same_as_billing) {
            $shippingAddress = $request->shipping_address;
            CustomerAddress::updateOrCreate(
                [
                    'customer_id' => $customer->id,
                    'type' => 'shipping',
                    'is_default' => true
                ],
                [
                    'address' => $shippingAddress['address'] ?? '',
                    'city' => $shippingAddress['city'] ?? '',
                    'state' => $shippingAddress['state'] ?? '',
                    'postal_code' => $shippingAddress['postal_code'] ?? '',
                    'country' => $shippingAddress['country'] ?? ''
                ]
            );
        } elseif ($request->same_as_billing && $request->billing_address) {
            $billingAddress = $request->billing_address;
            CustomerAddress::updateOrCreate(
                [
                    'customer_id' => $customer->id,
                    'type' => 'shipping',
                    'is_default' => true
                ],
                [
                    'address' => $billingAddress['address'] ?? '',
                    'city' => $billingAddress['city'] ?? '',
                    'state' => $billingAddress['state'] ?? '',
                    'postal_code' => $billingAddress['postal_code'] ?? '',
                    'country' => $billingAddress['country'] ?? ''
                ]
            );
        }

        return redirect()->route('customers.index')
            ->with('success', __('Customer updated successfully!'));
    }

    /**
     * Remove the specified resource from storage — GDPR-compliant erasure.
     * Anonymizes order snapshots and removes PII while retaining financial history.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);

        $customer = Customer::where('store_id', $currentStoreId)->findOrFail($id);
        app(\App\Services\CustomerDataErasureService::class)->erase($customer);

        return redirect()->route('customers.index')
            ->with('success', __('Customer deleted successfully!'));
    }

    /**
     * Add an INTERNAL merchant note to a customer identity.
     * Notes are merchant-only and scoped by store — never storefront-facing.
     */
    public function storeNote(Request $request, string $token)
    {
        $user = Auth::user();
        $storeId = (int) getCurrentStoreId($user);

        $ref = $this->resolveRefOrFail($token);
        // Validate the ref actually belongs to this store before writing.
        $this->assertRefExistsInStore($storeId, $ref);

        $request->validate([
            'note' => 'required|string|max:4000',
        ]);

        CustomerNote::create([
            'store_id' => $storeId,
            'customer_ref' => $ref,
            'note' => trim($request->note),
            'created_by' => $user->id,
        ]);

        return back();
    }

    /**
     * Delete a merchant note (only the owning store's notes).
     */
    public function destroyNote(Request $request, string $token, int $noteId)
    {
        $user = Auth::user();
        $storeId = (int) getCurrentStoreId($user);

        $ref = $this->resolveRefOrFail($token);
        $deleted = CustomerNote::where('store_id', $storeId)
            ->where('customer_ref', $ref)
            ->where('id', $noteId)
            ->delete();

        if (! $deleted) {
            throw ValidationException::withMessages(['note' => ['الملاحظة غير موجودة']]);
        }

        return back();
    }

    /**
     * Add a lightweight per-store merchant tag.
     */
    public function storeTag(Request $request, string $token)
    {
        $user = Auth::user();
        $storeId = (int) getCurrentStoreId($user);

        $ref = $this->resolveRefOrFail($token);
        $this->assertRefExistsInStore($storeId, $ref);

        $request->validate([
            'name' => 'required|string|max:60',
        ]);

        $name = trim($request->name);
        if ($name === '') {
            throw ValidationException::withMessages(['name' => ['الوسم مطلوب']]);
        }

        CustomerTag::firstOrCreate([
            'store_id' => $storeId,
            'customer_ref' => $ref,
            'name' => $name,
        ]);

        return back();
    }

    /**
     * Remove a merchant tag.
     */
    public function destroyTag(Request $request, string $token, int $tagId)
    {
        $user = Auth::user();
        $storeId = (int) getCurrentStoreId($user);

        $ref = $this->resolveRefOrFail($token);
        $deleted = CustomerTag::where('store_id', $storeId)
            ->where('customer_ref', $ref)
            ->where('id', $tagId)
            ->delete();

        if (! $deleted) {
            throw ValidationException::withMessages(['tag' => ['الوسم غير موجود']]);
        }

        return back();
    }

    private function resolveRefOrFail(string $token): string
    {
        $ref = app(CustomerIdentityService::class)->refFromToken($token);
        if ($ref === null) {
            abort(404);
        }

        return $ref;
    }

    /**
     * Ensure the identity keyed by ref exists within THIS store before any
     * note/tag write, so a forged/hostile token cannot create rows keyed to a
     * ref that belongs to another tenant (even though the note row itself is
     * store-scoped and unreachable, we still refuse to write ghost rows).
     */
    private function assertRefExistsInStore(int $storeId, string $ref): void
    {
        $identity = app(CustomerIdentityService::class);
        if ($identity->isCanonicalRef($ref)) {
            $id = $identity->canonicalIdFromRef($ref);
            if ($id && Customer::where('store_id', $storeId)->where('id', $id)->exists()) {
                return;
            }
        }

        $exists = \App\Models\Order::where('store_id', $storeId)
            ->whereNull('customer_id')
            ->limit(1)
            ->get(['customer_id','customer_phone','customer_email','id'])
            ->contains(function ($order) use ($identity, $ref) {
                return $identity->refForOrder([
                    'customer_id' => null,
                    'customer_phone' => $order->customer_phone,
                    'customer_email' => $order->customer_email,
                    'id' => $order->id,
                ]) === $ref;
            });

        if ($exists) {
            return;
        }

        abort(404);
    }

    /**
     * Export the merchant customer directory as CSV.
     *
     * Tenant-scoped (only the current store), and every free-text cell is
     * guarded against CSV formula injection. Totals are emitted as raw numbers
     * (no leading '=' etc.), one column per currency — never a combined value.
     */
    public function export(Request $request)
    {
        $user = Auth::user();
        $storeId = (int) getCurrentStoreId($user);
        $identity = app(CustomerIdentityService::class);

        $data = app(CustomerDirectoryService::class)->all($storeId, []);
        $identities = $data['identities'];

        $csvData = [];
        $csvData[] = [
            'Name', 'Phone', 'Email', 'Orders Count',
            'Order Value ILS', 'Order Value JOD', 'Order Value USD', 'Other Currencies',
            'Cancelled Orders', 'Repeat Buyer', 'Customer Type',
            'First Order', 'Last Order', 'Tags',
        ];

        $currencyCols = ['ILS', 'JOD', 'USD'];
        foreach ($identities as $row) {
            $totalsByCurrency = collect($row['totals'])->keyBy('currency');
            $other = collect($row['totals'])
                ->filter(fn ($g) => ! in_array($g['currency'], $currencyCols, true))
                ->map(fn ($g) => $g['currency'] . ':' . number_format((float) $g['total'], 2))
                ->implode('; ');

            $csvData[] = [
                $identity->csvSafe($row['full_name']),
                $identity->csvSafe($row['phone'] ?? ''),
                $identity->csvSafe($row['email'] ?? ''),
                (string) $row['orders_count'],
                number_format((float) ($totalsByCurrency['ILS']['total'] ?? 0), 2),
                number_format((float) ($totalsByCurrency['JOD']['total'] ?? 0), 2),
                number_format((float) ($totalsByCurrency['USD']['total'] ?? 0), 2),
                $identity->csvSafe($other),
                (string) $row['cancelled_count'],
                (bool) $row['is_repeat'] ? 'Yes' : 'No',
                $row['kind'] === 'registered' ? 'Registered' : 'Guest',
                $row['first_order_at'] ?? '',
                $row['last_order_at'] ?? '',
                $identity->csvSafe(implode(', ', $row['tags'] ?? [])),
            ];
        }

        $filename = 'customers-export-' . now()->format('Y-m-d') . '.csv';

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