<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice - {{ $orderNumber }}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; 
            padding: 20px; 
            color: #111827; 
            line-height: 1.5;
            background-color: #f9fafb;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header-section { 
            background: white;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        .header-content {
            display: table;
            width: 100%;
            table-layout: fixed;
        }
        .header-left {
            display: table-cell;
            vertical-align: top;
            width: 50%;
        }
        .header-right {
            display: table-cell;
            vertical-align: top;
            width: 50%;
            text-align: right;
        }
        .header h1 { 
            color: #111827; 
            margin: 0 0 8px 0; 
            font-size: 24px; 
            font-weight: 700;
        }
        .header p { 
            margin: 0; 
            font-size: 14px; 
            color: #6b7280;
        }
        .order-info-bar {
            background: #f9fafb;
            padding: 12px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: table;
            width: 100%;
            table-layout: fixed;
            box-sizing: border-box;
        }
        .order-info-left {
            display: table-cell;
            vertical-align: middle;
            width: 60%;
        }
        .order-info-right {
            display: table-cell;
            vertical-align: middle;
            width: 40%;
            text-align: right;
        }
        .status-text {
            color: #10b77f;
            font-size: 14px;
            font-weight: 600;
            text-transform: capitalize;
            margin-right: 16px;
        }
        .date-info {
            color: #6b7280;
            font-size: 14px;
            display: inline-block;
        }
        .order-id {
            color: #6b7280;
            font-size: 14px;
        }
        .customer-section { 
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: table; 
            width: 100%;
            table-layout: fixed;
            box-sizing: border-box;
        }
        .customer-info { 
            display: table-cell; 
            width: 50%; 
            vertical-align: top;
            padding-right: 12px;
        }
        .shipping-info { 
            display: table-cell; 
            width: 50%; 
            vertical-align: top;
            padding-left: 12px;
        }
        .section-title { 
            color: #111827; 
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 600;
        }
        .info-item { 
            margin: 6px 0; 
            font-size: 14px;
            color: #6b7280;
        }
        .info-item .label {
            font-weight: 500;
            color: #374151;
        }
        .info-item strong { 
            color: #374151;
            font-weight: 500;
        }
        .items-section {
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        .items-title {
            color: #111827;
            margin-bottom: 16px;
            font-size: 16px;
            font-weight: 600;
        }
        table { 
            width: 100%; 
            border-collapse: collapse;
        }
        th { 
            background: #f9fafb;
            color: #374151; 
            padding: 12px 16px; 
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e5e7eb;
        }
        td { 
            padding: 12px 8px; 
            font-size: 14px;
            border-bottom: 1px solid #f3f4f6;
        }
        .text-right { 
            text-align: right; 
        }
        .text-center { 
            text-align: center; 
        }
        .item-name {
            font-weight: 500;
            color: #111827;
            margin-bottom: 4px;
        }
        .variant-info {
            font-size: 12px;
            color: #6b7280;
        }
        .summary-section {
            padding: 20px 24px;
        }
        .summary-title {
            color: #111827;
            margin-bottom: 16px;
            font-size: 16px;
            font-weight: 600;
        }
        .summary-table {
            margin-left: auto;
            width: 350px;
            max-width: 100%;
        }
        .summary-table td {
            padding: 8px 0;
            border: none;
            font-size: 14px;
        }
        .summary-row {
            display: table;
            width: 100%;
            margin-bottom: 6px;
            table-layout: fixed;
        }
        .summary-label {
            display: table-cell;
            color: #6b7280;
            width: 60%;
            vertical-align: top;
        }
        .summary-value {
            display: table-cell;
            text-align: right;
            color: #111827;
            width: 40%;
            vertical-align: top;
        }
        .total-row {
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
            margin-top: 12px;
        }
        .total-row .summary-label {
            font-weight: 600;
            color: #111827;
            font-size: 16px;
        }
        .total-row .summary-value {
            font-weight: 700;
            color: #111827;
            font-size: 18px;
        }
        .discount-row .summary-value {
            color: #10b77f;
        }
        .footer { 
            text-align: center; 
            color: #6b7280;
            font-size: 14px;
            padding: 16px 24px;
            background: #f9fafb;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header Section -->
        <div class="header-section">
            <div class="header-content">
                <div class="header-left">
                    <h1 style="margin: 0px;">Order Invoice</h1>
                    <p>Order #{{ $orderNumber }}</p>
                </div>
                <div class="header-right">
                    <div style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 4px; margin-top: 16px;">{{ $config['storeName'] }}</div>
                    <div style="font-size: 14px; color: #6b7280;">{{ $config['email'] }}</div>
                    <div style="font-size: 14px; color: #6b7280;">{{ $config['phoneNumber'] }}</div>
                </div>
            </div>
        </div>
        
        <!-- Order Info Bar -->
        <div class="order-info-bar">
            <div class="order-info-left">
                <span class="status-text">{{ $order['status'] }}</span>
                <span class="date-info"><strong>Date:</strong> {{ date('M d, Y', strtotime($order['date'])) }}</span>
            </div>
            <div class="order-info-right">
                <div class="order-id"><strong>Order ID:</strong> {{ $order['id'] ?? $orderNumber }}</div>
            </div>
        </div>
        
        <!-- Customer & Shipping Info -->
        <div class="customer-section">
            <div class="customer-info">
                <div class="section-title">Customer Information</div>
                <div class="info-item"><span class="label">Name:</span> {{ $order['customer']['name'] }}</div>
                <div class="info-item"><span class="label">Email:</span> {{ $order['customer']['email'] }}</div>
                <div class="info-item"><span class="label">Phone:</span> {{ $order['customer']['phone'] }}</div>
            </div>
            <div class="shipping-info">
                <div class="section-title">Shipping Address</div>
                <div class="info-item"><strong>{{ $order['shipping_address']['name'] }}</strong></div>
                <div class="info-item">{{ $order['shipping_address']['address'] }}</div>
                <div class="info-item">{{ $order['shipping_address']['city'] }}, {{ $order['shipping_address']['state'] }} {{ $order['shipping_address']['postal_code'] }}</div>
                <div class="info-item">{{ $order['shipping_address']['country'] }}</div>
            </div>
        </div>
        
        <!-- Order Items -->
        <div class="items-section">
            <div class="items-title">Order Items</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 45%;">Item</th>
                        <th style="width: 10%;" class="text-center">Qty</th>
                        <th style="width: 15%;" class="text-right">Price</th>
                        <th style="width: 15%;" class="text-right">Tax</th>
                        <th style="width: 15%;" class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($order['items'] as $item)
                        @php
                            $itemTotal = $item['price'] * $item['quantity'];
                            $itemTotalWithTax = $itemTotal + ($item['tax_amount'] ?? 0);
                            $variants = is_string($item['variants'] ?? '') ? json_decode($item['variants'], true) : ($item['variants'] ?? []);
                        @endphp
                        <tr>
                            <td>
                                <div class="item-name">{{ $item['name'] }}</div>
                                @if($variants && count($variants) > 0)
                                    <div class="variant-info">
                                        @foreach($variants as $key => $value)
                                            {{ $key }}: {{ $value }}@if(!$loop->last), @endif
                                        @endforeach
                                    </div>
                                @endif
                            </td>
                            <td class="text-center" style="color: #6b7280;">{{ $item['quantity'] }}</td>
                            <td class="text-right" style="color: #6b7280;">{{ formatCurrency($item['price'], $storeSettings ?? [], $currencies ?? []) }}</td>
                            <td class="text-right" style="color: #6b7280;">
                                <div>{{ formatCurrency($item['tax_amount'] ?? 0, $storeSettings ?? [], $currencies ?? []) }}</div>
                                @if(isset($item['tax_name']) || isset($item['tax_percentage']))
                                    <div style="font-size: 12px; color: #9ca3af;">{{ $item['tax_name'] ?? 'Tax' }} @if($item['tax_percentage'])({{ $item['tax_percentage'] }}%)@endif</div>
                                @endif
                            </td>
                            <td class="text-right" style="font-weight: 600; color: #111827;">{{ formatCurrency($itemTotalWithTax, $storeSettings ?? [], $currencies ?? []) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        
        <!-- Order Summary -->
        <div class="summary-section">
            <div class="summary-table">
                <div class="summary-title">Order Summary</div>
                <div class="summary-row">
                    <div class="summary-label">Subtotal</div>
                    <div class="summary-value">{{ formatCurrency($order['subtotal'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                @if($order['discount'] > 0)
                <div class="summary-row discount-row">
                    <div class="summary-label">Coupon Discount @if($order['coupon'])({{ $order['coupon'] }})@endif</div>
                    <div class="summary-value">-{{ formatCurrency($order['discount'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                @endif
                <div class="summary-row">
                    <div class="summary-label">Tax</div>
                    <div class="summary-value">{{ formatCurrency($order['tax'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                <div class="summary-row">
                    <div class="summary-label">Shipping</div>
                    <div class="summary-value">{{ formatCurrency($order['shipping'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                <div class="summary-row total-row">
                    <div class="summary-label">Total</div>
                    <div class="summary-value">{{ formatCurrency($order['total'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                @if($order['payment_method'])
                <div class="summary-row" style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
                    <div class="summary-label">Payment Method</div>
                    <div class="summary-value">{{ $order['payment_method'] }}</div>
                </div>
                @endif
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>