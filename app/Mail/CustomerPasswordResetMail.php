<?php

namespace App\Mail;

use App\Models\Store;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomerPasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public $token;
    public $store;

    public function __construct($token, Store $store)
    {
        $this->token = $token;
        $this->store = $store;
    }

    public function build()
    {
        return $this->subject('Reset Your Password')
                    ->view('emails.customer-password-reset')
                    ->with([
                        'resetUrl' => $this->store->route('reset-password/'.$this->token),
                        'storeSlug' => $this->store->slug,
                    ]);
    }
}