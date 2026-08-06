<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Store subdomain / slug validation rules
    |--------------------------------------------------------------------------
    |
    | These rules apply to the store name chosen during onboarding, which is
    | slugified into the store subdomain, e.g. {slug}.{APP_DOMAIN}.
    |
    */

    'subdomain' => [
        'min_length' => 3,
        'max_length' => 30,
        'pattern' => '/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/',
    ],

    'store_name' => [
        'min_length' => 2,
        'max_length' => 60,
    ],

    /*
    |--------------------------------------------------------------------------
    | Reserved subdomains
    |--------------------------------------------------------------------------
    |
    | Names that clash with application paths, mail/web services or the main
    | brand, so they can never be claimed as a store subdomain.
    |
    */

    'reserved_subdomains' => [
        // core app / platform
        'wusool',
        'www',
        'app',
        'web',
        'api',
        'admin',
        'dashboard',
        'panel',
        'cp',
        'control',
        'backend',
        'frontend',
        'store',
        'stores',
        'shop',
        'shops',
        'home',
        'main',
        'landing',
        'auth',
        'login',
        'register',
        'signin',
        'signup',
        'logout',
        'password',
        'reset',
        'verify',
        'email',
        'verify-email',
        'forgot',
        'forgot-password',
        'mail',
        'smtp',
        'imap',
        'pop',
        'ftp',
        'sftp',
        'cpanel',
        'plesk',
        'files',
        'file',
        'assets',
        'static',
        'media',
        'uploads',
        'upload',
        'images',
        'img',
        'cdn',
        'css',
        'js',
        'fonts',
        'favicon',
        'robots',
        'sitemap',
        'manifest',
        'service-worker',
        'health',
        'status',
        'up',
        'down',
        'test',
        'tests',
        'demo',
        'dev',
        'stage',
        'staging',
        'prod',
        'production',
        'beta',
        'alpha',
        'local',
        'localhost',
        'help',
        'support',
        'docs',
        'documentation',
        'faq',
        'blog',
        'news',
        'about',
        'contact',
        'privacy',
        'terms',
        'policy',
        'legal',
        'jobs',
        'careers',
        'press',
        'partners',
        'affiliates',
        'affiliate',
        'referral',
        'referrals',
        'coupon',
        'coupons',
        'discount',
        'offers',
        'promo',
        'gift',
        'gifts',
        'cart',
        'checkout',
        'orders',
        'order',
        'invoice',
        'invoices',
        'account',
        'accounts',
        'profile',
        'settings',
        'wishlist',
        'search',
        'category',
        'categories',
        'product',
        'products',
        'category',
        'page',
        'pages',
        'payment',
        'payments',
        'pay',
        'pricing',
        'plans',
        'plan',
        'upgrade',
        'billing',
        'subscription',
        'subscriptions',
        'saas',
        'webhook',
        'webhooks',
        'callback',
        'oauth',
        'social',
        'api-docs',
    ],

    /*
    |--------------------------------------------------------------------------
    | Blocked (profane / policy-violating) words
    |--------------------------------------------------------------------------
    |
    | Subdomains and store names containing any of these words are rejected.
    | Words are matched against the raw store name and the slugified subdomain
    | (hyphens and numbers stripped) so "bad-word" or "badword1" are caught.
    |
    | Keep this list editable so new words can be added without code changes.
    |
    */

    'blocked_words' => [
        // English
        'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'cock', 'pussy',
        'cunt', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'fag', 'retard',
        'rape', 'rapist', 'kill', 'murder', 'terrorist', 'terror', 'bomb',
        'bombing', 'suicide', 'pedo', 'pedophile', 'molest', 'grooming',
        'scam', 'scammer', 'fraud', 'hack', 'hacker', 'virus', 'malware',
        'porn', 'porno', 'xxx', 'sex', 'nude', 'naked', 'hentai',
        'gambling', 'casino', 'betting', 'drug', 'cocaine', 'heroin',
        'weed', 'marijuana', 'cannabis', 'alcohol', 'beer', 'whisky', 'whiskey', 'vodka', 'wine',
        'cigarette', 'tobacco', 'gun', 'rifle', 'pistol', 'weapon', 'knife',
        'isis', 'isil', 'alqaeda', 'jihad', 'holocaust',
        // Arabic (common profanity / policy violations)
        'ابن', 'امك', 'خرة', 'خرا', 'زق', 'قحبة', 'قحبه', 'شرموط', 'شرموطه',
        'عاهرة', 'مومس', 'كلب', 'كلبة', 'حمار', 'حمارة', 'غبي', 'غبية', 'تافه',
        'حقير', 'حقيرة', 'وسخ', 'وسخة', 'نجس', 'قذر', 'قذرة', 'سافل', 'سافلة',
        'خنزير', 'خنزيرة', 'انتحر', 'انتحار', 'اقتل', 'قتل', 'اغتصاب', 'اغتصب',
        'قمار', 'مراهنات', 'مخدرات', 'مخدر', 'حشيش', 'كوكايين', 'كحول', 'خمر',
        'بيره', 'بيرة', 'سجائر', 'تبغ', 'سيجارة', 'سلاح', 'مسدس', 'بندقية', 'سكين',
        'ارهاب', 'ارهابي', 'داعش', 'قاعدة', 'قصم', 'قصمة',
    ],

];
