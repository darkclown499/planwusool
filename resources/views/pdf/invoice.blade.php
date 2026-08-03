<!DOCTYPE html>
<html lang="{{ $locale }}" dir="{{ in_array($locale, ['ar', 'he', 'fa', 'ur']) ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="utf-8">
    <title>Invoice - {{ $orderNumber }}</title>
    <style>
        @php
            $isRtl = in_array($locale ?? '', ['ar', 'he', 'fa', 'ur']);

            $labels = [
                'en' => [
                    'invoice' => 'Order Invoice',
                    'order_no' => 'Order #',
                    'date' => 'Date',
                    'order_id' => 'Order ID',
                    'status' => 'Status',
                    'customer_info' => 'Customer Information',
                    'name' => 'Name',
                    'email' => 'Email',
                    'phone' => 'Phone',
                    'shipping_address' => 'Shipping Address',
                    'order_items' => 'Order Items',
                    'item' => 'Item',
                    'qty' => 'Qty',
                    'price' => 'Price',
                    'tax' => 'Tax',
                    'total' => 'Total',
                    'order_summary' => 'Order Summary',
                    'subtotal' => 'Subtotal',
                    'coupon_discount' => 'Coupon Discount',
                    'tax_total' => 'Tax',
                    'shipping' => 'Shipping',
                    'total_row' => 'Total',
                    'payment_method' => 'Payment Method',
                    'vat_number' => 'VAT Number',
                    'tax_registration_number' => 'Tax Registration Number',
                    'thank_you' => 'Thank you for your business!',
                    'support' => 'If you have any questions, please contact our support team.',
                ],
                'ar' => [
                    'invoice' => 'فاتورة الطلب',
                    'order_no' => 'رقم الطلب:',
                    'date' => 'التاريخ',
                    'order_id' => 'رقم الطلب',
                    'status' => 'الحالة',
                    'customer_info' => 'معلومات العميل',
                    'name' => 'الاسم',
                    'email' => 'البريد الإلكتروني',
                    'phone' => 'الهاتف',
                    'shipping_address' => 'عنوان الشحن',
                    'order_items' => 'عناصر الطلب',
                    'item' => 'البند',
                    'qty' => 'الكمية',
                    'price' => 'السعر',
                    'tax' => 'الضريبة',
                    'total' => 'الإجمالي',
                    'order_summary' => 'ملخص الطلب',
                    'subtotal' => 'المجموع الفرعي',
                    'coupon_discount' => 'خصم الكوبون',
                    'tax_total' => 'الضريبة',
                    'shipping' => 'الشحن',
                    'total_row' => 'الإجمالي',
                    'payment_method' => 'طريقة الدفع',
                    'vat_number' => 'رقم ضريبة القيمة المضافة',
                    'tax_registration_number' => 'الرقم الضريبي',
                    'thank_you' => 'شكراً لتعاملكم معنا!',
                    'support' => 'إذا كان لديكم أي استفسار، يرجى التواصل مع فريق الدعم.',
                ],
                'he' => [
                    'invoice' => 'חשבונית הזמנה',
                    'order_no' => 'מס\' הזמנה:',
                    'date' => 'תאריך',
                    'order_id' => 'מספר הזמנה',
                    'status' => 'סטטוס',
                    'customer_info' => 'פרטי הלקוח',
                    'name' => 'שם',
                    'email' => 'אימייל',
                    'phone' => 'טלפון',
                    'shipping_address' => 'כתובת משלוח',
                    'order_items' => 'פריטי ההזמנה',
                    'item' => 'פריט',
                    'qty' => 'כמות',
                    'price' => 'מחיר',
                    'tax' => 'מס',
                    'total' => 'סה\"כ',
                    'order_summary' => 'סיכום הזמנה',
                    'subtotal' => 'סכום ביניים',
                    'coupon_discount' => 'הנחת קופון',
                    'tax_total' => 'מס',
                    'shipping' => 'משלוח',
                    'total_row' => 'סה\"כ',
                    'payment_method' => 'אמצעי תשלום',
                    'vat_number' => 'מספר ע.מ.',
                    'tax_registration_number' => 'מספר רישום מס',
                    'thank_you' => 'תודה על הרכישה!',
                    'support' => 'לכל שאלה, אנא פנו לצוות התמיכה שלנו.',
                ],
            ];
            $t = function ($key) use ($labels, $locale) {
                return $labels[$locale][$key] ?? $labels['en'][$key] ?? $key;
            };
        @endphp
        body { 
            font-family: 'DejaVu Sans', 'Amiri', sans-serif;
            margin: 0; 
            padding: 20px; 
            color: #111827; 
            line-height: 1.5;
            background-color: #f9fafb;
        }
        html[dir="rtl"] body { 
            font-family: 'Amiri', 'DejaVu Sans', sans-serif;
            direction: rtl;
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
        html[dir="rtl"] .header-right {
            text-align: left;
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
        html[dir="rtl"] .order-info-right {
            text-align: left;
        }
        .status-text {
            color: #10b77f;
            font-size: 14px;
            font-weight: 700;
            text-transform: capitalize;
            margin-right: 16px;
        }
        html[dir="rtl"] .status-text {
            margin-right: 0;
            margin-left: 16px;
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
        html[dir="rtl"] .customer-info {
            padding-right: 0;
            padding-left: 12px;
        }
        .shipping-info { 
            display: table-cell; 
            width: 50%; 
            vertical-align: top;
            padding-left: 12px;
        }
        html[dir="rtl"] .shipping-info {
            padding-left: 0;
            padding-right: 12px;
        }
        .section-title { 
            color: #111827; 
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 700;
        }
        .info-item { 
            margin: 6px 0; 
            font-size: 14px;
            color: #6b7280;
        }
        .info-item .label {
            font-weight: 700;
            color: #374151;
        }
        .info-item strong { 
            color: #374151;
            font-weight: 700;
        }
        .items-section {
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        .items-title {
            color: #111827;
            margin-bottom: 16px;
            font-size: 16px;
            font-weight: 700;
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
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e5e7eb;
        }
        html[dir="rtl"] th {
            text-align: right;
        }
        td { 
            padding: 12px 8px; 
            font-size: 14px;
            border-bottom: 1px solid #f3f4f6;
        }
        .text-right { 
            text-align: right; 
        }
        html[dir="rtl"] .text-right {
            text-align: left;
        }
        .text-center { 
            text-align: center; 
        }
        .item-name {
            font-weight: 700;
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
            font-weight: 700;
        }
        .summary-table {
            margin-left: auto;
            width: 350px;
            max-width: 100%;
        }
        html[dir="rtl"] .summary-table {
            margin-left: 0;
            margin-right: auto;
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
        html[dir="rtl"] .summary-value {
            text-align: left;
        }
        .total-row {
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
            margin-top: 12px;
        }
        .total-row .summary-label {
            font-weight: 700;
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
                    <h1 style="margin: 0px;">{{ $t('invoice') }}</h1>
                    <p>{{ $t('order_no') }} {{ $orderNumber }}</p>
                </div>
                <div class="header-right">
                    <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px; margin-top: 16px;">{{ $config['storeName'] }}</div>
                    <div style="font-size: 14px; color: #6b7280;">{{ $config['email'] }}</div>
                    <div style="font-size: 14px; color: #6b7280;">{{ $config['phoneNumber'] }}</div>
                    @if(!empty($vat['vat_number']) || !empty($vat['tax_registration_number']))
                        <div style="font-size: 14px; color: #6b7280;">
                            @if(!empty($vat['vat_number']))
                                <div>{{ $t('vat_number') }}: {{ $vat['vat_number'] }}</div>
                            @endif
                            @if(!empty($vat['tax_registration_number']))
                                <div>{{ $t('tax_registration_number') }}: {{ $vat['tax_registration_number'] }}</div>
                            @endif
                        </div>
                    @endif
                </div>
            </div>
        </div>
        
        <!-- Order Info Bar -->
        <div class="order-info-bar">
            <div class="order-info-left">
                <span class="status-text">{{ $order['status'] }}</span>
                <span class="date-info"><strong>{{ $t('date') }}:</strong> {{ date('M d, Y', strtotime($order['date'])) }}</span>
            </div>
            <div class="order-info-right">
                <div class="order-id"><strong>{{ $t('order_id') }}:</strong> {{ $order['id'] ?? $orderNumber }}</div>
            </div>
        </div>
        
        <!-- Customer & Shipping Info -->
        <div class="customer-section">
            <div class="customer-info">
                <div class="section-title">{{ $t('customer_info') }}</div>
                <div class="info-item"><span class="label">{{ $t('name') }}:</span> {{ $order['customer']['name'] }}</div>
                <div class="info-item"><span class="label">{{ $t('email') }}:</span> {{ $order['customer']['email'] }}</div>
                <div class="info-item"><span class="label">{{ $t('phone') }}:</span> {{ $order['customer']['phone'] }}</div>
            </div>
            <div class="shipping-info">
                <div class="section-title">{{ $t('shipping_address') }}</div>
                <div class="info-item"><strong>{{ $order['shipping_address']['name'] }}</strong></div>
                <div class="info-item">{{ $order['shipping_address']['address'] }}</div>
                <div class="info-item">{{ $order['shipping_address']['city'] }}, {{ $order['shipping_address']['state'] }} {{ $order['shipping_address']['postal_code'] }}</div>
                <div class="info-item">{{ $order['shipping_address']['country'] }}</div>
            </div>
        </div>
        
        <!-- Order Items -->
        <div class="items-section">
            <div class="items-title">{{ $t('order_items') }}</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 45%;">{{ $t('item') }}</th>
                        <th style="width: 10%;" class="text-center">{{ $t('qty') }}</th>
                        <th style="width: 15%;" class="text-right">{{ $t('price') }}</th>
                        <th style="width: 15%;" class="text-right">{{ $t('tax') }}</th>
                        <th style="width: 15%;" class="text-right">{{ $t('total') }}</th>
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
                                    <div style="font-size: 12px; color: #9ca3af;">{{ $item['tax_name'] ?? $t('tax') }} @if($item['tax_percentage'])({{ $item['tax_percentage'] }}%)@endif</div>
                                @endif
                            </td>
                            <td class="text-right" style="font-weight: 700; color: #111827;">{{ formatCurrency($itemTotalWithTax, $storeSettings ?? [], $currencies ?? []) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        
        <!-- Order Summary -->
        <div class="summary-section">
            <div class="summary-table">
                <div class="summary-title">{{ $t('order_summary') }}</div>
                <div class="summary-row">
                    <div class="summary-label">{{ $t('subtotal') }}</div>
                    <div class="summary-value">{{ formatCurrency($order['subtotal'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                @if($order['discount'] > 0)
                <div class="summary-row discount-row">
                    <div class="summary-label">{{ $t('coupon_discount') }} @if($order['coupon'])({{ $order['coupon'] }})@endif</div>
                    <div class="summary-value">-{{ formatCurrency($order['discount'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                @endif
                <div class="summary-row">
                    <div class="summary-label">{{ $t('tax_total') }}</div>
                    <div class="summary-value">{{ formatCurrency($order['tax'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                <div class="summary-row">
                    <div class="summary-label">{{ $t('shipping') }}</div>
                    <div class="summary-value">{{ formatCurrency($order['shipping'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                <div class="summary-row total-row">
                    <div class="summary-label">{{ $t('total_row') }}</div>
                    <div class="summary-value">{{ formatCurrency($order['total'], $storeSettings ?? [], $currencies ?? []) }}</div>
                </div>
                @if($order['payment_method'])
                <div class="summary-row" style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
                    <div class="summary-label">{{ $t('payment_method') }}</div>
                    <div class="summary-value">{{ $order['payment_method'] }}</div>
                </div>
                @endif
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>{{ $t('thank_you') }}</strong></p>
            <p>{{ $t('support') }}</p>
        </div>
    </div>
</body>
</html>
