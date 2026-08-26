<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StoreTransactionalMail extends Mailable
{
    use Queueable, SerializesModels;
    public function __construct(public string $subjectLine, public string $htmlBody) {}

    public function build()
    {
        return $this->subject($this->subjectLine)->html($this->htmlBody);
    }
}
