<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your GDPR Data Export is Ready</title>
</head>
<body style="font-family: 'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #10b77f, #0d9966); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                <span style="color: white; font-size: 24px; font-weight: bold;">W</span>
            </div>
            <h1 style="color: #1a202c; margin: 0; font-size: 24px;">{{ trans('Your GDPR Data Export is Ready') }}</h1>
        </div>

        <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin-bottom: 20px;">
            {{ trans('Hello') }},
        </p>

        <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin-bottom: 20px;">
            {{ trans('Your GDPR data export request has been completed and is ready for download. Your export contains all the personal data we have collected about you, including:') }}
        </p>

        <ul style="color: #4a5568; font-size: 15px; line-height: 2; margin-bottom: 25px; padding-right: 20px;">
            <li>{{ trans('Profile information and account settings') }}</li>
            <li>{{ trans('Store configurations and content') }}</li>
            <li>{{ trans('Order history and transaction records') }}</li>
            <li>{{ trans('Product catalog and inventory data') }}</li>
            <li>{{ trans('Customer information and communications') }}</li>
            <li>{{ trans('Payment and billing history') }}</li>
            <li>{{ trans('Referral and commission data') }}</li>
            <li>{{ trans('Notification preferences and history') }}</li>
            <li>{{ trans('Plan subscriptions and billing records') }}</li>
            <li>{{ trans('Media files and uploaded content') }}</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $downloadUrl }}" style="display: inline-block; background: linear-gradient(135deg, #10b77f, #0d9966); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 183, 127, 0.3); transition: all 0.2s;">
                {{ trans('Download Your Data Export') }}
            </a>
        </div>

        <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin-top: 25px; border-right: 4px solid #10b77f;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #2d3748;">{{ trans('Important Information') }}</p>
            <ul style="margin: 0; padding-right: 20px; color: #4a5568; font-size: 14px; line-height: 1.8;">
                <li>{{ trans('This download link will expire in 30 days for security reasons.') }}</li>
                <li>{{ trans('The export file is encrypted and password-protected. The password has been sent to you separately via SMS.') }}</li>
                <li>{{ trans('For security, this link can only be used once.') }}</li>
            </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

        <p style="color: #718096; font-size: 13px; text-align: center; margin: 0;">
            {{ trans('If you didn\'t request this export, please contact our support team immediately.') }}<br>
            {{ trans('© :year :appName. All rights reserved.', ['year' => date('Y'), 'appName' => config('app.name', 'Wusool')]) }}
        </p>
    </div>
</body>
</html>