<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class GdprDataExportReady extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $export;

    public function __construct($export)
    {
        $this->export = $export;
    }

    public function build()
    {
        return $this->subject('Your GDPR Data Export is Ready')
            ->view('emails.gdpr-export-ready')
            ->with([
                'export' => $this->export,
                'downloadUrl' => route('gdpr.export.download', $this->export->id),
            ]);
    }
}