<?php

namespace App\Services;

use App\Models\EmailTemplate;
use App\Models\Setting;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Cache;
use Exception;

class EmailTemplateService
{
    /**
     * Get available template variables for a specific template
     */
    public function getTemplateVariables(string $templateName): array
    {
        $variables = [];
        
        switch ($templateName) {
            case 'Order Created':
                $variables = [
                    '{app_name}' => 'Application Name',
                    '{order_name}' => 'Customer Name',
                    '{order_url}' => 'Order Details URL',
                    '{store_url}' => 'Store URL'
                ];
                break;
                
            case 'Order Created For Owner':
                $variables = [
                    '{app_name}' => 'Application Name',
                    '{owner_name}' => 'Store Owner Name',
                    '{order_id}' => 'Order ID',
                    '{order_date}' => 'Order Date',
                    '{order_url}' => 'Order Details URL',
                    '{store_url}' => 'Store URL'
                ];
                break;
                
            case 'Owner And Store Created':
                $variables = [
                    '{app_name}' => 'Application Name',
                    '{owner_name}' => 'Store Owner Name',
                    '{owner_email}' => 'Owner Email Address',
                    '{owner_password}' => 'Owner Password',
                    '{app_url}' => 'Application URL',
                    '{store_url}' => 'Store URL'
                ];
                break;
                
            case 'Status Change':
                $variables = [
                    '{app_name}' => 'Application Name',
                    '{order_name}' => 'Customer Name',
                    '{order_status}' => 'Order Status',
                    '{order_url}' => 'Order Details URL',
                    '{store_url}' => 'Store URL'
                ];
                break;
                
            case 'User Created':
                $variables = [
                    '{app_name}' => 'Application Name',
                    '{app_url}' => 'Application URL',
                    '{user_name}' => 'User Name',
                    '{user_email}' => 'User Email Address',
                    '{user_password}' => 'User Password',
                    '{user_type}' => 'User Type'
                ];
                break;
        }
        
        return $variables;
    }
    
    /**
     * Preview email template with sample data
     */
    public function previewTemplate(string $templateName, string $language = 'ar'): array
    {
        $template = EmailTemplate::where('name', $templateName)->first();
        if (!$template) {
            throw new Exception("Email template '{$templateName}' not found");
        }
        
        $templateLang = $this->getTemplateContent($template, $language);
        if (!$templateLang) {
            throw new Exception("No content found for template '{$templateName}'");
        }
        
        $variables = $this->getSampleVariables($templateName);
        
        return [
            'subject' => $this->replaceVariables($templateLang->subject, $variables),
            'content' => $this->replaceVariables($templateLang->content, $variables),
            'from' => $this->replaceVariables($template->from, $variables),
            'variables_used' => $variables
        ];
    }
    
    /**
     * Get sample data for template preview
     */
    private function getSampleVariables(string $templateName): array
    {
        $baseVariables = [
            '{app_name}' => config('app.name', 'Wusool'),
            '{app_url}' => url('/'),
            '{store_url}' => url('/store/demo-store')
        ];
        
        switch ($templateName) {
            case 'Order Created':
                return array_merge($baseVariables, [
                    '{order_name}' => 'John Doe',
                    '{order_url}' => url('/orders/12345')
                ]);
                
            case 'Order Created For Owner':
                return array_merge($baseVariables, [
                    '{owner_name}' => 'Store Owner',
                    '{order_id}' => '#12345',
                    '{order_date}' => now()->format('M d, Y'),
                    '{order_url}' => url('/orders/12345')
                ]);
                
            case 'Owner And Store Created':
                return array_merge($baseVariables, [
                    '{owner_name}' => 'New Store Owner',
                    '{owner_email}' => 'owner@example.com',
                    '{owner_password}' => '********'
                ]);
                
            case 'Status Change':
                return array_merge($baseVariables, [
                    '{order_name}' => 'John Doe',
                    '{order_status}' => 'Delivered',
                    '{order_url}' => url('/orders/12345')
                ]);
                
            case 'User Created':
                return array_merge($baseVariables, [
                    '{user_name}' => 'New User',
                    '{user_email}' => 'user@example.com',
                    '{user_password}' => '********',
                    '{user_type}' => 'Customer'
                ]);
                
            default:
                return $baseVariables;
        }
    }

    /**
     * Send template email with language support
     */
    public function sendTemplateEmailWithLanguage(string $templateName, array $variables, string $toEmail, string $toName = null, string $language = 'ar')
    {
        // Prevent duplicate emails within 10 seconds
        $emailKey = md5($templateName . $toEmail . serialize($variables));
        if (\Cache::has('email_sent_' . $emailKey)) {
            return false;
        }
        \Cache::put('email_sent_' . $emailKey, true, 10); // 10 seconds
        
        try {
            // Get store and user context for notification check
            $context = $this->getEmailContext($templateName, $variables);
            
            // Check if notification is enabled
            if (!$this->isNotificationEnabled($templateName, $context)) {
                return false;
            }
            
            // Get email template
            $template = EmailTemplate::where('name', $templateName)->first();
            if (!$template) {
                throw new Exception("Email template '{$templateName}' not found");
            }
            
            // Get template content
            $templateLang = $this->getTemplateContent($template, $language);
            if (!$templateLang) {
                throw new Exception("No content found for template '{$templateName}'");
            }

            // Prepare email content
            $subject = $this->replaceVariables($templateLang->subject, $variables);
            $content = $this->replaceVariables($templateLang->content, $variables);
            $fromName = $this->replaceVariables($template->from, $variables);

            // Configure SMTP and send email
            $this->configureBusinessSMTP($context);
            $this->sendEmail($subject, $content, $toEmail, $toName, $fromName);
            
            return true;
        } catch (Exception $e) {
            \Log::error('EMAIL FAILED', [
                'template' => $templateName,
                'email' => $toEmail,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get email context (user and store info)
     */
    private function getEmailContext(string $templateName, array $variables): array
    {
        $storeId = null;
        $userId = null;
        
        // Extract from store_url if available
        if (isset($variables['{store_url}']) && preg_match('/\/([^\/\<>"]+)$/', $variables['{store_url}'], $matches)) {
            $store = \App\Models\Store::where('slug', $matches[1])->first();
            if ($store) {
                $userId = $store->user_id;
                $storeId = getCurrentStoreId();
            }
        }
        
        // Fallback to current user
        if (!$userId && auth()->check()) {
            $user = auth()->user();
            $userId = $user->type === 'company' ? $user->id : $user->created_by;
            $storeId = getCurrentStoreId($user);
        }
        
        return compact('userId', 'storeId');
    }

    /**
     * Check if notification is enabled for template
     */
    private function isNotificationEnabled(string $templateName, array $context): bool
    {
        if (!$context['userId'] || !$context['storeId']) {
            return true; // Allow if no context
        }
        
        $setting = Setting::getSetting($templateName, $context['userId'], $context['storeId'], 'off');
        return $setting === 'on';
    }

    /**
     * Get template content for language
     */
    private function getTemplateContent($template, string $language)
    {
        return $template->emailTemplateLangs()->where('lang', $language)->first() 
            ?: $template->emailTemplateLangs()->where('lang', 'ar')->first();
    }

    /**
     * Configure business SMTP settings
     */
    private function configureBusinessSMTP(array $context)
    {
        $userId = $context['userId'] ?? null;
        $storeId = $context['storeId'] ?? null;
        $isCompanyContext = !empty($userId);
        
        $emailHost = getSetting('email_host', null, $userId, $storeId);
        $emailUsername = getSetting('email_username', null, $userId, $storeId);
        $emailPassword = getSetting('email_password', null, $userId, $storeId);
        
        if ($isCompanyContext && (!$emailHost || !$emailUsername || !$emailPassword)) {
            throw new Exception('Email configuration required. Please configure SMTP settings in company settings.');
        }

        if ($emailHost && $emailUsername && $emailPassword) {
            Config::set([
                'mail.default' => getSetting('email_driver', 'smtp', $userId, $storeId),
                'mail.mailers.smtp.host' => $emailHost,
                'mail.mailers.smtp.port' => getSetting('email_port', 587, $userId, $storeId),
                'mail.mailers.smtp.username' => $emailUsername,
                'mail.mailers.smtp.password' => $emailPassword,
                'mail.mailers.smtp.encryption' => getSetting('email_encryption', 'tls', $userId, $storeId),
            ]);
        }
    }

    /**
     * Send email
     */
    private function sendEmail(string $subject, string $content, string $toEmail, ?string $toName, string $fromName)
    {
        $fromEmail = getSetting('email_from_address') ?: config('mail.from.address');
        $finalFromName = getSetting('email_from_name') ?: $fromName;

        if (!$fromEmail) {
            throw new Exception('No email from address configured');
        }

        Mail::send([], [], function ($message) use ($subject, $content, $toEmail, $toName, $fromEmail, $finalFromName) {
            $message->to($toEmail, $toName)
                ->subject($subject)
                ->html($content)
                ->from($fromEmail, $finalFromName);
        });
    }

    /**
     * Replace variables in content
     */
    private function replaceVariables(string $content, array $variables): string
    {
        return str_replace(array_keys($variables), array_values($variables), $content);
    }

    /**
     * Dynamically discover variables from template content
     */
    public function discoverTemplateVariables(string $templateName): array
    {
        $template = EmailTemplate::where('name', $templateName)->first();
        
        if (!$template || !$template->emailTemplateLangs) {
            return [];
        }
        
        $variables = [];
        
        foreach ($template->emailTemplateLangs as $templateLang) {
            if ($templateLang) {
                $subjectVars = $this->extractVariablesFromText($templateLang->subject ?? '');
                $contentVars = $this->extractVariablesFromText($templateLang->content ?? '');
                $variables = array_merge($variables, $subjectVars, $contentVars);
            }
        }
        
        if ($template->from) {
            $fromVars = $this->extractVariablesFromText($template->from);
            $variables = array_merge($variables, $fromVars);
        }
        
        return array_unique($variables);
    }
    
    /**
     * Extract variables from text content
     */
    private function extractVariablesFromText(string $text): array
    {
        preg_match_all('/\{([^}]+)\}/', $text, $matches);
        
        return array_map(function($match) {
            return '{' . $match . '}';
        }, $matches[1]);
    }
}