<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class GdprDeletionConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public $deletionRequest;

    public function __construct($deletionRequest)
    {
        $this->deletionRequest = $deletionRequest;
    }

    public function build()
    {
        return $this->subject('Account Deletion Request Confirmation')
            ->view('emails.gdpr-deletion-confirmation')
            ->with([
                'request' => $this->deletionRequest,
                'cancelUrl' => route('gdpr.deletion.cancel', $this->deletionRequest->id),
            ]);
    }
}