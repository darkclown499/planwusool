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
        $storeQuery = $user->type === 'company'
            ? Store::where('user_id', $user->id)
            : Store::where('user_id', $user->created_by);

        return $storeQuery->findOrFail($storeId);
    }

    /**
     * Resolve a domain that belongs to the given store.
     */
    private function resolveDomain(Store $store, $domainId)
    {
        return $store->storeDomains()->findOrFail($domainId);
    }

    /**
     * List all domains for a store, plus the DNS setup hints.
     */
    public function index($storeId)
    {
        $store = $this->resolveStore($storeId);

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

    /**
     * Add a new custom domain to the store.
     */
    public function store($storeId, Request $request)
    {
        $store = $this->resolveStore($storeId);

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

        $domain->ssl_status = $this->checkSslConnection($domain->domain_name) ? 'active' : 'pending';
        $domain->save();

        return response()->json([
            'domain' => $this->formatDomain($domain->refresh()),
            'message' => $domain->ssl_status === 'active'
                ? 'SSL certificate is active.'
                : 'No SSL certificate detected yet. Make sure the domain points to our servers.',
        ]);
    }

    /**
     * Set a domain as the primary custom domain.
     */
    public function makePrimary($storeId, $domainId)
    {
        $store = $this->resolveStore($storeId);
        $domain = $this->resolveDomain($store, $domainId);

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
