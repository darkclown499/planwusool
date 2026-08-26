<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;

class MailConfigService
{
    /**
     * Check whether email settings are properly configured.
     *
     * The app supports two configurations:
     *   1. SMTP credentials saved in the database (admin panel).
     *   2. A mailer configured via the environment (.env), e.g. MAIL_MAILER=sendmail
     *      or an SMTP provider, which requires no database settings.
     */
    public static function isConfigured(): bool
    {
        return self::hasDatabaseSmtpSettings() || self::hasEnvMailer();
    }

    /**
     * Whether a real transport is available from the environment/config, e.g.
     * sendmail, SES, Postmark, Resend, Mailgun or a configured SMTP provider.
     */
    public static function hasEnvMailer(): bool
    {
        $default = (string) config('mail.default', 'log');
        $mailer  = (array) config("mail.mailers.{$default}", []);
        $transport = strtolower((string) ($mailer['transport'] ?? $default));

        return ! in_array($transport, ['log', 'array'], true);
    }

    /**
     * Whether SMTP credentials were saved in the database settings table.
     */
    public static function hasDatabaseSmtpSettings(): bool
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
     * Set dynamic mail configuration from database settings.
     *
     * Returns true when either a valid database SMTP config was applied or a
     * working env-configured mailer is already in place.
     */
    public static function setDynamicConfig()
    {
        if (! self::hasDatabaseSmtpSettings()) {
        return false; // Do NOT fall back to platform SMTP — missing store email config means emails should NOT be sent
        }

        // Apply SMTP settings from the database
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

    /**
     * Set dynamic mail configuration for a specific store.
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

        // If the store has credentials, apply them; otherwise fall back to the
        // env / application-level config (e.g. sendmail).
        if (! empty($settings['username']) && ! empty($settings['password'])) {
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

        return self::hasEnvMailer();
    }
}