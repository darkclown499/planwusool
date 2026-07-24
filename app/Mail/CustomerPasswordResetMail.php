<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomerPasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public $token;
    public $storeSlug;

    public function __construct($token, $storeSlug)
    {
        $this->token = $token;
        $this->storeSlug = $storeSlug;
    }

    public function build()
    {
        return $this->subject('Reset Your Password')
                    ->view('emails.customer-password-reset')
                    ->with([
                        'resetUrl' => route('store.reset-password', ['storeSlug' => $this->storeSlug, 'token' => $this->token]),
                        'storeSlug' => $this->storeSlug
                    ]);
    }
}