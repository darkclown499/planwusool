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
                'cartTotal' => number_format($this->cart->cart_total, 2),
                'items' => is_array($this->cart->cart_items) ? $this->cart->cart_items : [],
                'storeName' => $this->cart->store?->name ?? 'المتجر',
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
