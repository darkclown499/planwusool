<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deletion Request Confirmation</title>
</head>
<body style="font-family: 'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #e53e3e, #c53030); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3h13.856z" />
                </svg>
            </div>
            <h1 style="color: #1a202c; margin: 0; font-size: 24px;">{{ trans('Account Deletion Request Received') }}</h1>
        </div>

        <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin-bottom: 20px;">
            {{ trans('Hello') }},
        </p>

        <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin-bottom: 20px;">
            {{ trans('We have received your request to delete your account and all associated personal data. This email confirms that we have received your request and it is now being processed.') }}
        </p>

        <div style="background-color: #fff5f5; border-radius: 8px; padding: 20px; margin: 25px 0; border-right: 4px solid #e53e3e;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #c53030;">{{ trans('Request Details') }}</p>
            <ul style="margin: 0; padding-right: 20px; color: #4a5568; font-size: 14px; line-height: 2;">
                <li><strong>{{ trans('Request ID') }}:</strong> {{ $request->id }}</li>
                <li><strong>{{ trans('Requested At') }}:</strong> {{ $request->requested_at->format('Y-m-d H:i:s') }}</li>
                <li><strong>{{ trans('Reason') }}:</strong> {{ $request->reason ?: trans('Not specified') }}</li>
                <li><strong>{{ trans('Status') }}:</strong> <span style="color: #e53e3e; font-weight: 600;">{{ trans($request->status) }}</span></li>
            </ul>
        </div>

        <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border-right: 4px solid #10b77f;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #2d3748;">{{ trans('What Happens Next') }}</p>
            <ul style="margin: 0; padding-right: 20px; color: #4a5568; font-size: 14px; line-height: 1.8;">
                <li>{{ trans('Your request will be processed within 30 days as required by GDPR.') }}</li>
                <li>{{ trans('All your personal data will be permanently deleted, including:') }}
                    <ul style="margin: 5px 0 5px 20px; padding-right: 20px;">
                        <li>{{ trans('Account profile and credentials') }}</li>
                        <li>{{ trans('Store data, products, and orders') }}</li>
                        <li>{{ trans('Customer information and communications') }}</li>
                        <li>{{ trans('Payment and billing records') }}</li>
                        <li>{{ trans('Referral and commission data') }}</li>
                    </ul>
                </li>
                <li>{{ trans('You will receive a confirmation email once the deletion is complete.') }}</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $cancelUrl }}" style="display: inline-block; background-color: #fff; color: #e53e3e; padding: 12px 24px; border: 2px solid #e53e3e; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; transition: all 0.2s;">
                {{ trans('Cancel Deletion Request') }}
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

        <p style="color: #718096; font-size: 13px; text-align: center; margin: 0;">
            {{ trans('If you did not request this deletion, please contact our support team immediately.') }}<br>
            {{ trans('© :year :appName. All rights reserved.', ['year' => date('Y'), 'appName' => config('app.name', 'Wusool')]) }}
        </p>
    </div>
</body>
</html>