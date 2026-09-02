<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Store-isolated editable WhatsApp message template for merchant commerce
 * actions (order updates, customer follow-ups, abandoned-cart recovery).
 *
 * Isolation: every template is scoped to one store (unique store_id+key+locale),
 * so merchant A can never read or affect merchant B's templates. Bodies use the
 * single-brace placeholder syntax ({order_number}) and are rendered by an
 * allowlist renderer that never evaluates dynamic code.
 */
class WhatsAppTemplate extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_templates';

    public const LOCALE_AR = 'ar';
    public const LOCALE_EN = 'en';

    public const KEYS = [
        'order_received',
        'order_confirmed',
        'preparing',
        'shipped',
        'delivered',
        'payment_reminder',
        'abandoned_cart',
        'customer_followup',
    ];

    protected $fillable = [
        'store_id',
        'key',
        'locale',
        'body',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public static function keys(): array
    {
        return self::KEYS;
    }

    public static function locales(): array
    {
        return [self::LOCALE_AR, self::LOCALE_EN];
    }
}
