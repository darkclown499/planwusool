<?php

namespace App\Services;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * CSV export for Analytics & Reporting.
 *
 * Every value is escaped against spreadsheet formula injection: cells whose
 * text begins with =, +, -, @ or a tab/carriage return are prefixed with a
 * single quote so they render as literal text in Excel/Google Sheets. The
 * stream includes a UTF-8 BOM for Arabic text. This is the same streaming
 * pattern used by the payment operations export.
 */
final class AnalyticsCsvExporter
{
    /**
     * @param  array<int,string>  $header
     * @param  iterable<array<int,mixed>>  $rows
     */
    public function download(string $filename, array $header, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $rows): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }

            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $header);

            foreach ($rows as $row) {
                fputcsv($out, array_map([$this, 'safe'], array_values($row)));
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array<string,mixed>
     */
    private function safe(mixed $value): string
    {
        if (is_numeric($value)) {
            return (string) $value;
        }

        $str = $value === null ? '' : (string) $value;

        if ($str === '') {
            return $str;
        }

        $first = $str[0];
        if ($first === '=' || $first === '+' || $first === '-' || $first === '@' || $first === "\t" || $first === "\r") {
            return "'" . $str;
        }

        return $str;
    }
}