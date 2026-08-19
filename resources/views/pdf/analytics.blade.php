<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <title>تقرير التحليلات</title>
    <style>
        body {
            font-family: 'Amiri', 'DejaVu Sans', sans-serif;
            margin: 0;
            padding: 24px;
            color: #111827;
            line-height: 1.6;
            font-size: 14px;
        }
        h1 { font-size: 22px; margin: 0 0 4px 0; }
        h2 { font-size: 16px; margin: 20px 0 8px 0; color: #111827; }
        .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
        .grid-metrics { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .grid-metrics td { border: 1px solid #e5e7eb; padding: 10px 12px; }
        .metric-value { font-size: 18px; font-weight: 700; }
        .metric-label { color: #6b7280; font-size: 12px; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.data th {
            background: #f3f4f6;
            color: #374151;
            text-align: right;
            padding: 8px 10px;
            border: 1px solid #e5e7eb;
            font-size: 12px;
        }
        table.data td {
            padding: 8px 10px;
            border: 1px solid #e5e7eb;
            font-size: 13px;
        }
        .footer {
            margin-top: 28px;
            text-align: center;
            color: #9ca3af;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <h1>تقرير التحليلات والتقارير</h1>
    <div class="meta">
        النطاق: {{ $scopeLabel }} | الفترة: {{ $periodLabel }} | تاريخ الإصدار: {{ $generatedAt }}
    </div>

    <table class="grid-metrics">
        <tr>
            <td>
                <div class="metric-label">إجمالي الإيرادات (الفترة)</div>
                <div class="metric-value">{{ $currency($metrics['revenue']['current']) }}</div>
                <div class="metric-label">{{ $metrics['revenue']['change'] }}٪ التغيير</div>
            </td>
            <td>
                <div class="metric-label">إجمالي الطلبات</div>
                <div class="metric-value">{{ number_format($metrics['orders']['current']) }}</div>
                <div class="metric-label">التغيير: {{ $metrics['orders']['change'] }}</div>
            </td>
            <td>
                <div class="metric-label">إجمالي العملاء</div>
                <div class="metric-value">{{ number_format($metrics['customers']['total']) }}</div>
                <div class="metric-label">جدد: {{ number_format($metrics['customers']['new']) }}</div>
            </td>
            <td>
                <div class="metric-label">نسبة التحويل</div>
                <div class="metric-value">{{ $metrics['conversion']['rate'] }}٪</div>
                <div class="metric-label">التغيير: {{ $metrics['conversion']['change'] }}٪</div>
            </td>
        </tr>
    </table>

    <h2>المنتجات الأكثر مبيعاً</h2>
    @if (count($topProducts) === 0)
        <p style="color:#9ca3af;">لا توجد بيانات متاحة حالياً</p>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th>الكمية المباعة</th>
                    <th>الإيرادات</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($topProducts as $product)
                    <tr>
                        <td>{{ $product['name'] }}</td>
                        <td>{{ $product['sales'] }}</td>
                        <td>{{ $product['revenue'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h2>أفضل العملاء</h2>
    @if (count($topCustomers) === 0)
        <p style="color:#9ca3af;">لا توجد بيانات متاحة حالياً</p>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th>العميل</th>
                    <th>عدد الطلبات</th>
                    <th>إجمالي الإنفاق</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($topCustomers as $customer)
                    <tr>
                        <td>{{ $customer['name'] }}</td>
                        <td>{{ $customer['orders'] }}</td>
                        <td>{{ $customer['spent'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h2>الإيرادات اليومية</h2>
    @if (count($revenueChart) === 0)
        <p style="color:#9ca3af;">لا توجد بيانات متاحة حالياً</p>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>الإيرادات</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($revenueChart as $row)
                    <tr>
                        <td>{{ $row['date'] }}</td>
                        <td>{{ $currency($row['revenue']) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="footer">
        هذا التقرير مولّد آلياً ولا يتطلب توقيعاً.
    </div>
</body>
</html>