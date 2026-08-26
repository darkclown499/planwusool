<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\StoreDomain;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class StoreDomainController extends Controller
{
    /**
     * Resolve the store that belongs to the authenticated user.
     */
    private function resolveStore($storeId)
    {
        $user = Auth::user();

        return resolveStoreQuery($user)->findOrFail($storeId);
    }

    /**
     * Resolve a domain that belongs to the given store.
     */
    private function resolveDomain(Store $store, $domainId)
    {
        return $store->storeDomains()->findOrFail($domainId);
    }

    /**
     * Guard: connecting a custom (external) domain requires a plan that
     * explicitly enables custom domains. Super admins always pass.
     *
     * @return \Illuminate\Http\JsonResponse|null
     */
    private function requireDomainPlan(Store $store)
    {
        $user = Auth::user();
        if ($user && $user->isSuperAdmin()) {
            return null;
        }

        if (!$store->canUseCustomDomain()) {
            return response()->json([
                'message' => __('ربط النطاق المخصص غير متاح في خطتك الحالية. يرجى ترقية الخطة لاستخدام نطاقك الخاص.'),
            ], 403);
        }

        return null;
    }

    /**
     * List all domains for a store, plus the DNS setup hints.
     * Serves both Inertia page (HTML) and JSON API (XHR) from same URI.
     *
     * IMPORTANT: Inertia visits (X-Inertia header) must ALWAYS receive an
     * Inertia response, never plain JSON — otherwise the frontend shows:
     * "All Inertia requests must receive a valid Inertia response, however
     * a plain JSON response was received."
     * The JSON branch is only for the DomainsTab component via apiGet().
     */
    public function index(Request $request, $storeId)
    {
        $store = $this->resolveStore($storeId);

        $isInertia = (bool) $request->header('X-Inertia');

        if ($gate = $this->requireDomainPlan($store)) {
            // Inertia visits should never receive plain JSON for the plan gate either
            if ($isInertia) {
                return redirect()->back()->with('error', 'ربط النطاق المخصص غير متاح في خطتك الحالية.');
            }
            // For API/XHR callers, return the JSON gate response
            if ($request->expectsJson() || $request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return $gate;
            }
            return redirect()->back()->with('error', 'ربط النطاق المخصص غير متاح في خطتك الحالية.');
        }

        // Inertia visits must always render the page — never JSON
        if ($isInertia) {
            return \Inertia\Inertia::render('stores/domains', [
                'store' => $store,
            ]);
        }

        // JSON API branch — used by DomainsTab component via apiGet()
        // Explicitly exclude Inertia requests (defense in depth)
        if (!$isInertia && ($request->expectsJson() || $request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest' || $request->header('Accept') === 'application/json')) {
            $domains = $store->storeDomains()
                ->orderByDesc('is_primary')
                ->orderBy('id')
                ->get()
                ->map(fn ($domain) => $this->formatDomain($domain));

            return response()->json([
                'domains' => $domains,
                'dns' => [
                    'cnameTarget' => $store->slug . '.' . config('app.store_domain'),
                    'aRecord' => $this->getServerIp() ?: '',
                    'mainDomain' => getBaseDomain(),
                    'verificationHost' => '_wusool-verify',
                ],
                'store' => [
                    'id' => $store->id,
                    'slug' => $store->slug,
                    'default_url' => $store->getStoreSubdomainUrl(),
                    'store_url' => $store->getStoreUrl(),
                ],
            ]);
        }

        // Inertia page branch — canonical merchant UI (non-Inertia HTML fallback)
        return \Inertia\Inertia::render('stores/domains', [
            'store' => $store,
        ]);
    }

    /**
     * Add a new custom domain to the store.
     */
    public function store($storeId, Request $request)
    {
        $store = $this->resolveStore($storeId);

        if ($gate = $this->requireDomainPlan($store)) {
            return $gate;
        }

        $data = $request->validate([
            'domain_name' => 'required|string|max:255',
        ]);

        $domain = $this->normalizeDomain($data['domain_name']);

        if ($error = $this->validateDomain($domain, $store)) {
            return response()->json(['message' => $error], 422);
        }

        $storeDomain = StoreDomain::create([
            'store_id' => $store->id,
            'domain_name' => $domain,
            'is_verified' => false,
            'ssl_status' => 'pending',
            'verification_token' => 'wa-verify-' . Str::random(32),
            'is_primary' => !$store->storeDomains()->exists(),
        ]);

        return response()->json([
            'domain' => $this->formatDomain($storeDomain),
            'message' => 'Domain added. Configure your DNS records then verify ownership.',
        ], 201);
    }

    /**
     * Verify domain ownership via a DNS TXT record.
     */
    public function verify($storeId, $domainId)
    {
        $store = $this->resolveStore($storeId);
        $domain = $this->resolveDomain($store, $domainId);

        if ($gate = $this->requireDomainPlan($store)) {
            return $gate;
        }

        $verified = $this->checkDnsTxt($domain);

        $domain->is_verified = $verified;
        if ($verified) {
            $domain->verified_at = now();
        }
        $domain->save();

        return response()->json([
            'domain' => $this->formatDomain($domain->refresh()),
            'message' => $verified
                ? 'Domain verified successfully.'
                : 'Verification record not found yet. Make sure the TXT record is published and try again.',
        ]);
    }

    /**
     * Check whether an SSL certificate is currently served on the domain.
     */
    public function checkSsl($storeId, $domainId)
    {
        $store = $this->resolveStore($storeId);
        $domain = $this->resolveDomain($store, $domainId);

        if ($gate = $this->requireDomainPlan($store)) {
            return $gate;
        }

        if ($this->checkSslConnection($domain->domain_name)) {
            $domain->ssl_status = 'active';
        } elseif ($this->isApexPointingToServer($domain->domain_name)) {
            // DNS already points to our servers, but TLS is not served yet.
            $domain->ssl_status = 'error';
        } else {
            $domain->ssl_status = 'pending';
        }
        $domain->save();

        $message = match ($domain->ssl_status) {
            'active' => 'SSL certificate is active.',
            'error' => 'SSL certificate could not be detected. Make sure your domain points to our servers and the web server is configured.',
            default => 'No SSL certificate detected yet. Make sure the domain points to our servers.',
        };

        return response()->json([
            'domain' => $this->formatDomain($domain->refresh()),
            'message' => $message,
        ]);
    }

    /**
     * Set a domain as the primary custom domain.
     */
    public function makePrimary($storeId, $domainId)
    {
        $store = $this->resolveStore($storeId);
        $domain = $this->resolveDomain($store, $domainId);

        if ($gate = $this->requireDomainPlan($store)) {
            return $gate;
        }

        $store->storeDomains()->update(['is_primary' => false]);
        $domain->is_primary = true;
        $domain->save();

        return response()->json(['domain' => $this->formatDomain($domain->refresh())]);
    }

    /**
     * Remove a custom domain from the store.
     */
public function destroy($storeId, $domainId)
    {
        $store = $this->resolveStore($storeId);
        $domain = $this->resolveDomain($store, $domainId);

        if ($gate = $this->requireDomainPlan($store)) {
            return $gate;
        }

        $domain->delete();

        // If we removed the primary domain, promote the oldest verified one
        $newPrimary = $store->storeDomains()
            ->where('is_verified', true)
            ->orderBy('id')
            ->first();
        if ($newPrimary) {
            $store->storeDomains()->update(['is_primary' => false]);
            $newPrimary->is_primary = true;
            $newPrimary->save();
        }

        return response()->json(['message' => 'Domain removed.']);
    }

    /**
     * Normalize a raw domain input.
     */
    private function normalizeDomain(string $value): string
    {
        $domain = strtolower(trim($value));
        $domain = str_replace(['http://', 'https://'], '', $domain);
        // Drop any path/query portion
        if (str_contains($domain, '/')) {
            $domain = explode('/', $domain)[0];
        }
        if (str_contains($domain, '?')) {
            $domain = explode('?', $domain)[0];
        }
        return rtrim($domain, '.');
    }

    /**
     * Validate a normalized domain. Returns an error string or null when valid.
     */
    private function validateDomain(string $domain, Store $store): ?string
    {
        if (empty($domain) || strlen($domain) > 253) {
            return 'Enter a valid domain name.';
        }

        if (!filter_var($domain, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)) {
            return 'Invalid domain format. Example: mystore.com';
        }

        if (in_array($domain, ['localhost', '127.0.0.1', 'www', 'admin', 'api', 'mail'])) {
            return 'This domain is reserved.';
        }

        $mainAppDomain = getBaseDomain();
        $mainAppDomainWithoutWww = str_starts_with($mainAppDomain, 'www.') ? substr($mainAppDomain, 4) : $mainAppDomain;
        $domainWithoutWww = str_starts_with($domain, 'www.') ? substr($domain, 4) : $domain;

        if ($domain === $mainAppDomain
            || $domainWithoutWww === $mainAppDomainWithoutWww
            || $domain === 'www.' . $mainAppDomainWithoutWww) {
            return 'You cannot use the main application domain as a custom domain.';
        }

        // Do not allow a subdomain of the application domain (already handled by the default subdomain system)
        $storeDomain = config('app.store_domain');
        if (str_ends_with($domainWithoutWww, '.' . $storeDomain) || $domainWithoutWww === $storeDomain) {
            return 'This domain is managed automatically. Use your own domain name instead.';
        }

        // A store cannot have the same custom domain twice
        if ($store->storeDomains()->where('domain_name', $domain)->exists()) {
            return 'This domain is already in use.';
        }

        if (!Store::isDomainAvailable($domain, $store->id)) {
            return 'This domain is already in use.';
        }

        return null;
    }

    /**
     * Check the ownership TXT record for a domain.
     */
    private function checkDnsTxt(StoreDomain $domain): bool
    {
        if (!function_exists('dns_get_record') || !$domain->verification_token) {
            return false;
        }

        $records = @dns_get_record('_wusool-verify.' . $domain->domain_name, DNS_TXT);
        if (!$records) {
            return false;
        }

        foreach ($records as $record) {
            if (trim($record['txt'] ?? '') === $domain->verification_token) {
                return true;
            }
        }

        return false;
    }

    /**
     * Probe whether the domain currently serves a TLS certificate.
     */
    private function checkSslConnection(string $domain): bool
    {
        $errno = 0;
        $errstr = '';
        $context = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
        $fp = @stream_socket_client('ssl://' . $domain . ':443', $errno, $errstr, 5, STREAM_CLIENT_CONNECT, $context);

        if ($fp) {
            fclose($fp);
            return true;
        }

        return false;
    }

    /**
     * Whether the domain's DNS A record currently resolves to our server IP.
     * Used to differentiate "still propagating" from a real SSL problem.
     */
    private function isApexPointingToServer(string $domain): bool
    {
        if (!function_exists('dns_get_record')) {
            return false;
        }

        $serverIp = $this->getServerIp();
        if (!$serverIp) {
            return false;
        }

        $records = @dns_get_record($domain, DNS_A);
        if (!$records) {
            return false;
        }

        foreach ($records as $record) {
            if (!empty($record['ip']) && $record['ip'] === $serverIp) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the server IP address for the A record instructions.
     */
    private function getServerIp()
    {
        $serverIp = null;

        if (!empty($_SERVER['SERVER_ADDR'])) {
            $serverIp = $_SERVER['SERVER_ADDR'];
        } elseif (!empty($_SERVER['LOCAL_ADDR'])) {
            $serverIp = $_SERVER['LOCAL_ADDR'];
        }

        if (!$serverIp || $serverIp === '127.0.0.1' || $serverIp === '::1') {
            try {
                $serverIp = trim((string) file_get_contents('https://ipinfo.io/ip'));
            } catch (\Exception $e) {
                try {
                    $serverIp = trim((string) file_get_contents('https://api.ipify.org'));
                } catch (\Exception $e) {
                    $serverIp = null;
                }
            }
        }

        return $serverIp;
    }

    /**
     * Format a domain for JSON responses.
     */
    private function formatDomain(StoreDomain $domain)
    {
        return [
            'id' => $domain->id,
            'store_id' => $domain->store_id,
            'domain_name' => $domain->domain_name,
            'url' => 'https://' . $domain->domain_name,
            'is_verified' => (bool) $domain->is_verified,
            'ssl_status' => $domain->ssl_status,
            'verification_token' => $domain->verification_token,
            'is_primary' => (bool) $domain->is_primary,
            'verified_at' => $domain->verified_at ? $domain->verified_at->toIso8601String() : null,
            'created_at' => $domain->created_at ? $domain->created_at->toIso8601String() : null,
        ];
    }
}
