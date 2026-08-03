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

    /**
     * The abandoned cart instance.
     */
    public AbandonedCart $cart;

    /**
     * Create a new message instance.
     */
    public function __construct(AbandonedCart $cart)
    {
        $this->cart = $cart;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You left items in your cart!',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.abandoned-cart-reminder',
            with: [
                'cart' => $this->cart,
                'customerName' => $this->cart->customer_name ?? 'Valued Customer',
                'cartTotal' => number_format($this->cart->cart_total, 2),
                'items' => is_array($this->cart->cart_items) ? $this->cart->cart_items : [],
                'storeName' => $this->cart->store->name ?? 'Store',
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
