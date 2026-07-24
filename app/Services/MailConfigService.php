<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;

class MailConfigService
{
    /**
     * Check whether email settings are properly configured.
     */
    public static function isConfigured(): bool
    {
        $host     = getSetting('email_host', '');
        $username = getSetting('email_username', '');
        $password = getSetting('email_password', '');

        // Treat default placeholder values as not configured
        $defaultHosts = ['smtp.example.com', 'smtp.mailtrap.io', '', null];

        if (in_array(trim($host), $defaultHosts, true)) {
            return false;
        }

        if (empty(trim($username)) || empty(trim($password))) {
            return false;
        }

        return true;
    }

    /**
     * Set dynamic mail configuration from database settings
     */
    public static function setDynamicConfig()
    {
        // Validate before applying config — prevents crash when SMTP is unconfigured
        if (!self::isConfigured()) {
            return false;
        }

        // Load email settings from database
        $settings = [
            'driver' => getSetting('email_driver', 'smtp'),
            'host' => getSetting('email_host', 'smtp.example.com'),
            'port' => getSetting('email_port', '587'),
            'username' => getSetting('email_username', ''),
            'password' => getSetting('email_password', ''),
            'encryption' => getSetting('email_encryption', 'tls'),
            'fromAddress' => getSetting('email_from_address', 'noreply@example.com'),
            'fromName' => getSetting('email_from_name', 'Wusool System')
        ];

        // Only configure if we have valid settings
        if (!empty($settings['username']) && !empty($settings['password'])) {
            Config::set([
                'mail.default' => $settings['driver'],
                'mail.mailers.smtp.host' => $settings['host'],
                'mail.mailers.smtp.port' => $settings['port'],
                'mail.mailers.smtp.encryption' => $settings['encryption'] === 'none' ? null : $settings['encryption'],
                'mail.mailers.smtp.username' => $settings['username'],
                'mail.mailers.smtp.password' => $settings['password'],
                'mail.from.address' => $settings['fromAddress'],
                'mail.from.name' => $settings['fromName'],
            ]);
            return true;
        }
        
        return false;
    }
    
    /**
     * Set dynamic mail configuration for specific store
     */
    public static function setStoreMailConfig($userId, $storeId)
    {
        // Load email settings from database
        $settings = [
            'driver' => getSetting('email_driver', 'smtp', $userId, $storeId),
            'host' => getSetting('email_host', 'smtp.example.com', $userId, $storeId),
            'port' => getSetting('email_port', '587', $userId, $storeId),
            'username' => getSetting('email_username', '', $userId, $storeId),
            'password' => getSetting('email_password', '', $userId, $storeId),
            'encryption' => getSetting('email_encryption', 'tls', $userId, $storeId),
            'fromAddress' => getSetting('email_from_address', 'noreply@example.com', $userId, $storeId),
            'fromName' => getSetting('email_from_name', 'Wusool System', $userId, $storeId)
        ];

        // Only configure if we have valid settings
        if (!empty($settings['username']) && !empty($settings['password'])) {
            Config::set([
                'mail.default' => $settings['driver'],
                'mail.mailers.smtp.host' => $settings['host'],
                'mail.mailers.smtp.port' => $settings['port'],
                'mail.mailers.smtp.encryption' => $settings['encryption'] === 'none' ? null : $settings['encryption'],
                'mail.mailers.smtp.username' => $settings['username'],
                'mail.mailers.smtp.password' => $settings['password'],
                'mail.from.address' => $settings['fromAddress'],
                'mail.from.name' => $settings['fromName'],
            ]);
            return true;
        }
        
        return false;
    }
}
