<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Customer-facing storefront supported countries
    |--------------------------------------------------------------------------
    |
    | Single source of truth for every customer address/checkout flow.
    | ISO codes for the only countries the platform currently supports for
    | customer delivery. Global dataset remains intact; this allow-list
    | restricts only STOREFRONT customer flows.
    |
    | Referenced by:
    | - ThemeController::storefrontViewProps (payload filtering)
    | - Api\LocationController (GET endpoints)
    | - Store\OrderController (checkout validation)
    | - Frontend CheckoutContext CountryDropdown
    |
    */
    'supported_customer_countries' => ['PSE', 'ISR', 'JOR'],

    // Human mapping for diagnostic messages (code => Arabic label)
    'country_labels' => [
        'PSE' => 'فلسطين',
        'ISR' => 'إسرائيل',
        'JOR' => 'الأردن',
    ],
];
