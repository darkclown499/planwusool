<?php

namespace App\Events;

use App\Models\Store;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StoreCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Store $store, public string $password = '')
    {
    }
}