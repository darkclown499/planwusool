<?php

namespace App\Mail;

use App\Models\AbandonedCart;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AbandonedCartReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public AbandonedCart $cart;

    public function __construct(AbandonedCart $cart)
    {
        $this->cart = $cart;
    }

    public function envelope(): Envelope
    {
        $storeName = $this->cart->store?->name ?? 'المتجر';
        return new Envelope(
            subject: "{$storeName} - لقد تركت منتجات في سلتك!",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.abandoned-cart-reminder',
            with: [
                'cart' => $this->cart,
                'customerName' => $this->cart->customer_name ?? 'عميلنا الكريم',
                'cartTotal' => $this->formatCartTotal($this->cart->cart_total),
                'items' => is_array($this->cart->cart_items) ? $this->cart->cart_items : [],
                'storeName' => $this->cart->store?->name ?? 'المتجر',
            ],
        );
    }

    private function formatCartTotal($value): string
    {
        if ($value === null || $value === '') {
            return '0.00';
        }
        if (is_numeric($value)) {
            return number_format((float) $value, 2, '.', '');
        }
        if (is_array($value) || is_object($value)) {
            return '—';
        }
        $raw = trim((string) $value);
        return $raw !== '' ? $raw : '0.00';
    }

    public function attachments(): array
    {
        return [];
    }
}
