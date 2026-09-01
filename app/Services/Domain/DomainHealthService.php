<?php

namespace App\Services\Domain;

use App\Models\Store;
use App\Models\StoreDomain;

/**
 * Truthful, server-derived domain status and store health.
 *
 * The merchant UI must never derive "connected" on the client: every status
 * here is computed from stored verification + SSL state (and optionally live
 * checks performed by a throttled recheck endpoint). No fabricated health.
 */
class DomainHealthService
{
    public const STATUS_NOT_CONNECTED = 'not_connected';
    public const STATUS_PENDING_DNS = 'pending_dns';
    public const STATUS_VERIFIED = 'verified';
    public const STATUS_SSL_PENDING = 'ssl_pending';
    public const STATUS_READY = 'ready';
    public const STATUS_SSL_ERROR = 'ssl_error';

    /**
     * Truthful per-domain status derived from stored verification + SSL state.
     *
     * @return array{status: string, label: string, description: string}
     */
    public static function statusFor(?StoreDomain $domain): array
    {
        if (!$domain) {
            return [
                'status' => self::STATUS_NOT_CONNECTED,
                'label' => 'غير مربوط',
                'description' => 'لم تتم إضافة أي نطاق مخصص بعد. أضف نطاقك واربطه.',
            ];
        }

        if (!$domain->is_verified) {
            return [
                'status' => self::STATUS_PENDING_DNS,
                'label' => 'بانتظار إعداد DNS',
                'description' => 'أضف سجلات DNS اللازمة ثم اضغط إعادة التحقق لإثبات الملكية.',
            ];
        }

        return match ((string) $domain->ssl_status) {
            'active' => [
                'status' => self::STATUS_READY,
                'label' => 'جاهز',
                'description' => 'النطاق مربوط وشهادة SSL نشطة. المتجر مفتوح على هذا النطاق.',
            ],
            'error' => [
                'status' => self::STATUS_SSL_ERROR,
                'label' => 'خطأ في الإعداد',
                'description' => 'النطاق مربوط لكن النظام لم يجد شهادة SSL نشطة. تأكد من توجيه DNS وتكوين الخادم.',
            ],
            default => [
                'status' => self::STATUS_SSL_PENDING,
                'label' => 'SSL قيد التجهيز',
                'description' => 'النطاق مربوط ويتم الآن تجهيز شهادة SSL.',
            ],
        };
    }

    /**
     * Aggregate health for a store from its attached domains.
     *
     * @return array{dns: array, routing: array, ssl: array, primary: array, canonical_domain: string|null, default_subdomain: string, www: string}
     */
    public static function storeHealth(Store $store): array
    {
        $domains = $store->storeDomains()->orderByDesc('is_primary')->orderBy('id')->get();
        $verified = $domains->filter(fn ($d) => (bool) $d->is_verified);
        $primary = $domains->firstWhere('is_primary', true) ?: $verified->first();

        $dns = match (true) {
            $verified->isNotEmpty() => ['status' => 'ready', 'label' => 'جاهز'],
            $domains->isNotEmpty() => ['status' => 'pending', 'label' => 'بانتظار إعداد DNS'],
            default => ['status' => 'not_configured', 'label' => 'غير مربوط'],
        };

        $routingDone = $primary && $primary->is_verified && $primary->is_primary;
        $routingFallbackOk = !$primary && $verified->isNotEmpty();
        $routing = match (true) {
            $routingDone => ['status' => 'ready', 'label' => 'جاهز', 'domain' => $primary->domain_name],
            $routingFallbackOk => ['status' => 'ready', 'label' => 'جاهز', 'domain' => $verified->first()->domain_name],
            $domains->isEmpty() => ['status' => 'not_configured', 'label' => 'غير مربوط'],
            default => ['status' => 'pending', 'label' => 'بانتظار التحقق'],
        };

        $ssl = match (true) {
            $verified->isNotEmpty() && $verified->contains(fn ($d) => $d->ssl_status === 'active') =>
                ['status' => 'active', 'label' => 'نشط'],
            $verified->isNotEmpty() && $verified->contains(fn ($d) => $d->ssl_status === 'error') =>
                ['status' => 'error', 'label' => 'خطأ في الإعداد'],
            $verified->isNotEmpty() => ['status' => 'pending', 'label' => 'قيد التجهيز'],
            default => ['status' => 'not_configured', 'label' => 'غير مربوط'],
        };

        return [
            'dns' => $dns,
            'routing' => $routing,
            'ssl' => $ssl,
            'primary' => [
                'status' => $primary ? 'ready' : 'not_configured',
                'domain' => $primary?->domain_name,
                'label' => $primary ? 'محدد' : 'غير محدد',
            ],
            'canonical_domain' => $store->getStoreUrl(),
            'default_subdomain' => $store->getStoreSubdomainUrl(),
            // The app layer never redirects between www / non-www: the host
            // resolver accepts both variants when the matching record exists,
            // so there is no redirect loop. This is honest about the current
            // Wusool routing behaviour and requires no Nginx-specific config.
            'www' => 'النسختان www وغير www تُفتحان نفس المتجر دون أي تحويلات أو حلقات. اختر الشكل الذي تفضله كدومين أساسي.',
        ];
    }
}