<?php

namespace App\Listeners;

use App\Events\StoreCreated;
use App\Services\EmailTemplateService;

class SendStoreCreatedEmail
{
    protected $emailTemplateService;

    public function __construct(EmailTemplateService $emailTemplateService)
    {
        $this->emailTemplateService = $emailTemplateService;
    }

    public function handle(StoreCreated $event)
    {
        $store = $event->store;
        $owner = $store->user;

        $variables = [
            '{owner_name}' => $owner->name,
            '{owner_email}' => $owner->email,
            '{owner_password}' => $event->password ?: 'Please use your account password to login',
            '{store_name}' => $store->name,
            '{store_url}' => route('store.home', ['storeSlug' => $store->slug]),
            '{app_name}' => config('app.name', 'Wusool'),
            '{app_url}' => getSchemeAwareUrl()
        ];

        $this->emailTemplateService->sendTemplateEmailWithLanguage(
            'Owner And Store Created',
            $variables,
            $owner->email,
            $owner->name,
            $owner->lang ?? 'ar'
        );
    }
}