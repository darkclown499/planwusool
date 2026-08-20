<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $p = Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.analytics', [
        'scopeLabel' => 'Test Store',
        'periodLabel' => '2026-08-01 - 2026-08-19',
        'generatedAt' => date('Y-m-d H:i:s'),
        'metrics' => [
            'revenue' => ['current' => 100.5, 'change' => 5.2],
            'orders' => ['current' => 12, 'change' => 2],
            'customers' => ['total' => 8, 'new' => 1],
            'conversion' => ['rate' => 9.1, 'change' => 0.5],
        ],
        'topProducts' => [],
        'topCustomers' => [],
        'revenueChart' => [],
        'currency' => fn ($v) => number_format((float) $v, 2) . ' ₪',
    ]);
    $out = $p->output();
    file_put_contents(__DIR__ . '/storage/app/analytics-test.pdf', $out);
    echo strlen($out) > 1000 ? 'PDF_OK ' . strlen($out) : 'PDF_TOO_SMALL';
} catch (Throwable $e) {
    echo 'ERR: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine();
}