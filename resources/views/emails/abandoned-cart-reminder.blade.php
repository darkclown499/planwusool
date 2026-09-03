<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You left items in your cart!</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .card {
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .header {
            background: linear-gradient(135deg, #3B82F6, #1D4ED8);
            color: #ffffff;
            padding: 32px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .header p {
            margin: 8px 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 32px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .message {
            color: #666;
            margin-bottom: 24px;
        }
        .items-list {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item-name {
            font-weight: 500;
        }
        .item-qty {
            color: #64748b;
        }
        .total {
            text-align: right;
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 24px;
        }
        .cta-button {
            display: inline-block;
            background: #3B82F6;
            color: #ffffff;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
        }
        .cta-button:hover {
            background: #2563EB;
        }
        .footer {
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            color: #94a3b8;
            font-size: 12px;
            margin: 4px 0;
        }
        .footer a {
            color: #3B82F6;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>{{ $storeName }}</h1>
                <p>Don't forget your items!</p>
            </div>

            <div class="content">
                <div class="greeting">Hello {{ $customerName }},</div>

                <div class="message">
                    You left some items in your shopping cart. Don't miss out — complete your order now!
                </div>

                @if(count($items) > 0)
                <div class="items-list">
                    @foreach($items as $item)
                    <div class="item">
                        <span class="item-name">{{ $item['name'] ?? 'Product' }}</span>
                        <span class="item-qty">x{{ $item['quantity'] ?? 1 }}</span>
                    </div>
                    @endforeach
                </div>
                @endif

                <div class="total">
                    Total: {{ is_numeric($cartTotal) ? number_format((float) $cartTotal, 2) : e($cartTotal) }}
                </div>

                <a href="{{ url('/') }}" class="cta-button">
                    Complete Your Order
                </a>
            </div>

            <div class="footer">
                <p>If you have any questions, feel free to reply to this email.</p>
                <p>&copy; {{ date('Y') }} {{ $storeName }}. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
