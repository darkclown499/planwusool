<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImportBatch;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;

/**
 * Bulk product import engine (CSV / XLSX).
 *
 * Flow: upload -> column mapping -> validation preview -> confirm -> result.
 *
 * Design invariants
 * ----------------
 * - Imported products pass through the canonical Product model exactly like
 *   normal merchant product creation (same fields, same limit rules, same
 *   tenant scoping). There is no second product pipeline.
 * - Uploading a file only stores a "previewed" batch; the catalog is never
 *   touched until an explicit confirmed import for that batch.
 * - Confirmed imports are idempotent: a batch executes once (atomic status
 *   claim) and double-clicks cannot duplicate the catalog.
 * - Stores are fully isolated: SKU matching, categories and report downloads
 *   are always scoped to the batch's own store.
 */
class ProductImportService
{
    /** Hard caps (reported to the merchant in the UI). */
    public const MAX_ROWS = 5000;
    public const MAX_COLUMNS = 40;
    public const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
    public const ALLOWED_EXTENSIONS = ['csv' => 'csv', 'xlsx' => 'xlsx'];

    /** Canonical import fields (mapping targets). Brand is intentionally absent: no brand model exists. */
    public const FIELDS = [
        'name', 'sku', 'barcode', 'description', 'price', 'compare_at_price',
        'stock', 'category', 'status', 'image_url',
        'option1_name', 'option1_value', 'option2_name', 'option2_value',
        'variant_sku', 'variant_price', 'variant_stock',
    ];

    /** Column names accepted for auto-detection, keyed by canonical field. */
    public const ALIASES = [
        'name' => ['name', 'product', 'product name', 'productname', 'title', 'اسم المنتج', 'المنتج', 'الاسم', 'اسم'],
        'sku' => ['sku', 'product sku', 'كود', 'رمز', 'الكود', 'الرمز'],
        'barcode' => ['barcode', 'bar code', 'upc', 'ean', 'الباركود', 'باركود'],
        'description' => ['description', 'desc', 'product description', 'الوصف', 'الوصف التفصيلي', 'التفاصيل'],
        'price' => ['price', 'product price', 'unit price', 'السعر', 'سعر', 'الثمن'],
        'compare_at_price' => ['compare at price', 'compareatprice', 'old price', 'regular price', 'list price', 'السعر قبل الخصم', 'سعر المقارنة', 'السعر الأصلي', 'قبل الخصم'],
        'stock' => ['stock', 'quantity', 'qty', 'inventory', 'الكمية', 'المخزون', 'المتوفر', 'المخزون المتوفر', 'الكميه'],
        'category' => ['category', 'cat', 'group', 'التصنيف', 'الفئة', 'المجموعة', 'القسم', 'التصنيف الفرعي'],
        'status' => ['status', 'الحالة', 'الحاله', 'الوضع'],
        'image_url' => ['image', 'image url', 'imageurl', 'images', 'photo', 'link', 'الصورة', 'الصور', 'رابط الصورة', 'رابط صورة', 'صورة'],
        'option1_name' => ['option1 name', 'option1name', 'option 1 name', 'color name', 'خيار 1', 'الخيار 1', 'اسم الخيار الأول', 'اللون'],
        'option1_value' => ['option1 value', 'option1value', 'option 1 value', 'color value', 'قيمة الخيار 1', 'قيمةالخيار1'],
        'option2_name' => ['option2 name', 'option2name', 'option 2 name', 'size name', 'خيار 2', 'الخيار 2', 'اسم الخيار الثاني', 'المقاس'],
        'option2_value' => ['option2 value', 'option2value', 'option 2 value', 'size value', 'قيمة الخيار 2', 'قيمةالخيار2'],
        'variant_sku' => ['variant sku', 'variantsku', 'variant sku', 'skuvariant', 'sku المتغير', 'سكيو المتغير'],
        'variant_price' => ['variant price', 'variantprice', 'variant price', 'سعر المتغير', 'سعر المتغیر'],
        'variant_stock' => ['variant stock', 'variantstock', 'مخزون المتغير', 'مخزون المتغیر'],
    ];

    /**
     * Resolve the canonical field a header maps to (lazy: trim, lowercase, strip spaces/BOM).
     */
    public function detectFieldForHeader(string $header): ?string
    {
        $header = trim($header);
        if ($header === '') {
            return null;
        }
        $header = (string) preg_replace('/\xEF\xBB\xBF/', '', $header);
        $normalized = mb_strtolower($header, 'UTF-8');
        $normalized = str_replace([' ', '_', '-', 'ـ'], '', $normalized);

        foreach (self::ALIASES as $field => $aliases) {
            foreach ($aliases as $alias) {
                if (mb_strtolower(str_replace([' ', '_', '-', 'ـ'], '', trim($alias)), 'UTF-8') === $normalized) {
                    return $field;
                }
            }
        }

        return null;
    }

    /**
     * Suggest an initial {"header": "field"} mapping for an array of headers.
     */
    public function suggestMapping(array $headers): array
    {
        $mapping = [];
        $used = [];
        foreach ($headers as $header) {
            $field = $this->detectFieldForHeader($header);
            // Don't map two source columns to the same canonical field.
            if ($field !== null && !in_array($field, $used, true)) {
                $mapping[$header] = $field;
                $used[] = $field;
            } else {
                $mapping[$header] = '';
            }
        }

        return $mapping;
    }

    public function maximumRows(): int
    {
        return self::MAX_ROWS;
    }

    public function maximumBytes(): int
    {
        return self::MAX_BYTES;
    }

    /* ------------------------------------------------------------------ */
    /* Parsing                                                            */
    /* ------------------------------------------------------------------ */

    public function extensionOf(UploadedFile $file): ?string
    {
        $ext = strtolower($file->getClientOriginalExtension());
        if ($ext === '') {
            // Fall back to guessing from the client mime type.
            $mime = strtolower($file->getClientMimeType() ?? '');
            if ($mime === 'text/csv' || $mime === 'text/plain' || $mime === 'application/csv') {
                return 'csv';
            }
            if (str_contains($mime, 'spreadsheetml')) {
                return 'xlsx';
            }

            return null;
        }

        return isset(self::ALLOWED_EXTENSIONS[$ext]) ? $ext : null;
    }

    /**
     * Validate upload safety limits. Returns array with 'ok' bool and 'error' string.
     */
    public function validateUpload(UploadedFile $file): array
    {
        if (!$file->isValid()) {
            return ['ok' => false, 'error' => __('تعذر قراءة الملف. أعد رفع الملف والمحاولة مرة أخرى.')];
        }

        $ext = $this->extensionOf($file);
        if ($ext === null) {
            return ['ok' => false, 'error' => __('صيغة الملف غير مدعومة. الملفات المسموح بها هي CSV و XLSX فقط.')];
        }

        if ($file->getSize() > self::MAX_BYTES) {
            return ['ok' => false, 'error' => __('حجم الملف كبير جداً. الحد الأقصى هو :size ميغابايت.', ['size' => (int) (self::MAX_BYTES / 1024 / 1024)])];
        }

        return ['ok' => true, 'ext' => $ext];
    }

    /**
     * Parse an uploaded spreadsheet into an array of string[][] rows (including header).
     *
     * @throws \RuntimeException on unreadable/malformed content.
     */
    public function parseFile(UploadedFile $file, string $ext): array
    {
        $path = $file->getRealPath();

        if ($ext === 'csv') {
            $content = @file_get_contents($path);
            if ($content === false) {
                throw new \RuntimeException('unreadable');
            }

            return $this->parseCsvContent($content);
        }

        return $this->parseXlsx($path);
    }

    protected function parseCsvContent(string $content): array
    {
        // Strip UTF-8 BOM + normalize CRLF.
        $content = (string) preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $content = str_replace(["\r\n", "\r"], "\n", $content);

        $rows = [];
        $row = [];
        $field = '';
        $inQuotes = false;
        $length = strlen($content);
        $fieldTouched = false;

        for ($i = 0; $i < $length; $i++) {
            $c = $content[$i];
            if ($inQuotes) {
                if ($c === '"') {
                    if (isset($content[$i + 1]) && $content[$i + 1] === '"') {
                        $field .= '"';
                        $i++;
                    } else {
                        $inQuotes = false;
                    }
                } else {
                    $field .= $c;
                }
                continue;
            }

            if ($c === '"') {
                $inQuotes = true;
                $fieldTouched = true;
            } elseif ($c === ',') {
                $row[] = $field;
                $field = '';
                $fieldTouched = false;
            } elseif ($c === "\n") {
                $row[] = $field;
                $field = '';
                $fieldTouched = false;
                $rows[] = $row;
                $row = [];
            } else {
                $field .= $c;
                $fieldTouched = true;
            }
        }

        if ($field !== '' || $fieldTouched) {
            $row[] = $field;
        }
        if (!empty($row) || count($rows) === 0) {
            $rows[] = $row;
        }

        return array_values(array_filter($rows, fn ($r) => is_array($r)));
    }

    protected function parseXlsx(string $path): array
    {
        try {
            $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
            $reader->setReadDataOnly(true);
            $reader->setReadEmptyCells(false);
            $reader->setReadFilter(new class implements IReadFilter
            {
                public function readCell($columnAddress, $row, $worksheetName = ''): bool
                {
                    return $row <= (ProductImportService::MAX_ROWS + 1)
                        && \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString((string) $columnAddress) <= ProductImportService::MAX_COLUMNS;
                }
            });

            $spreadsheet = $reader->load($path);
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray(null, true, false, false);
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet, $worksheet);

            // PhpSpreadsheet returns row-col arrays; project to minimal arrays.
            $clean = [];
            foreach ($rows as $r) {
                if (!is_array($r)) {
                    continue;
                }
                $clean[] = array_values($r);
            }
            $limit = self::MAX_ROWS + 1;
            if (count($clean) > $limit) {
                $clean = array_slice($clean, 0, $limit);
            }

            return $clean;
        } catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $e) {
            throw new \RuntimeException('malformed');
        } catch (\Throwable $e) {
            throw new \RuntimeException('malformed');
        }
    }

    /* ------------------------------------------------------------------ */
    /* Template export                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Build a downloadable template CSV (header + one example row).
     */
    public function templateCsv(): \Closure
    {
        $headers = ['name', 'sku', 'barcode', 'description', 'price', 'compare_at_price', 'stock', 'category', 'status', 'image_url', 'option1_name', 'option1_value', 'option2_name', 'option2_value', 'variant_sku', 'variant_price', 'variant_stock'];
        $example = ['قميص قطني', 'SH-001', '6250001234567', 'قميص قطني مريح للاستخدام اليومي', '89.90', '119.90', '25', 'ملابس', 'active', 'https://example.com/shirt.jpg', 'اللون', 'أحمر', 'المقاس', 'L', 'SH-001-RED-L', '94.90', '10'];

        return function () use ($headers, $example) {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF"); // Excel-friendly BOM
            fputcsv($file, $headers);
            fputcsv($file, $example);
            fclose($file);
        };
    }

    /* ------------------------------------------------------------------ */
    /* Preview                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Parse an upload far enough to surface its column headers + a suggested
     * field mapping (drives the mapping step). Creates nothing.
     */
    public function parseForMapping(UploadedFile $file): array
    {
        $upload = $this->validateUpload($file);
        if (!$upload['ok']) {
            throw new \InvalidArgumentException($upload['error']);
        }
        $ext = $upload['ext'];

        $raw = $this->parseFile($file, $ext);
        if (count($raw) === 0) {
            throw new \RuntimeException(__('تعذر قراءة الملف'));
        }

        $headers = $this->cleanHeaders(array_shift($raw));
        $headers = array_values(array_filter($headers, fn ($h) => trim((string) $h) !== ''));
        if (count($headers) === 0) {
            throw new \RuntimeException(__('لا يوجد صف ترويسة في الملف. تأكد من أن الصف الأول يحتوي على أسماء الأعمدة.'));
        }

        return [
            'file_type' => $ext,
            'headers' => $headers,
            'suggested_mapping' => $this->suggestMapping($headers),
        ];
    }

    /**
     * Parse + validate an upload into a stored "previewed" batch.
     * Returns [batch, summary, errorsRows[]].
     *
     * @throws \RuntimeException when the file cannot be parsed.
     */
    public function buildPreview(User $user, int $storeId, UploadedFile $file, array $mapping, array $options): array
    {
        $upload = $this->validateUpload($file);
        if (!$upload['ok']) {
            throw new \InvalidArgumentException($upload['error']);
        }
        $ext = $upload['ext'];

        $rawRows = $this->parseFile($file, $ext);
        if (count($rawRows) === 0) {
            throw new \RuntimeException(__('تعذر قراءة الملف'));
        }

        $headers = $this->cleanHeaders(array_shift($rawRows));
        if (count($rawRows) === 0) {
            throw new \RuntimeException(__('الملف لا يحتوي على منتجات قابلة للاستيراد'));
        }

        // Build every row as an associative array keyed by canonical field using the mapping.
        $normalized = $this->applyMapping($rawRows, $headers, $mapping);

        // Enforce hard row cap on DATA rows (file may be trimmed at parse time).
        if (count($normalized) > self::MAX_ROWS) {
            $normalized = array_slice($normalized, 0, self::MAX_ROWS);
        }

        [$rows, $rowErrors, $rowWarnings] = $this->validateRows($storeId, $normalized, $options);

        $total = count($rows);
        $errorRows = count($rowErrors);
        $warningRows = 0;
        $validRows = 0;
        foreach ($rows as $r) {
            if (isset($rowErrors[$r['row']])) {
                continue;
            }
            if (isset($rowWarnings[$r['row']])) {
                $warningRows++;
            } else {
                $validRows++;
            }
        }

        // Cross-row/product duplicate SKU detection.
        [$rows, $rowErrors, $rowWarnings, $dupInfo] = $this->detectSkuIssues($storeId, $rows, $rowErrors, $rowWarnings, $options);
        // Recompute buckets after duplicate detection.
        $errorRows = count($rowErrors);
        $warningRows = 0;
        $validRows = 0;
        foreach ($rows as $r) {
            if (isset($rowErrors[$r['row']])) {
                continue;
            }
            if (isset($rowWarnings[$r['row']])) {
                $warningRows++;
            } else {
                $validRows++;
            }
        }

        $estimatedProducts = $this->estimateProducts($rows, $rowErrors);

        $strategy = ($options['strategy'] ?? 'create_only') === 'update_by_sku' ? 'update_by_sku' : 'create_only';

        $batch = new ProductImportBatch();
        $batch->store_id = $storeId;
        $batch->user_id = $user->id;
        $batch->original_filename = $file->getClientOriginalName() ?: ($file->getFilename() ?: 'upload');
        $batch->file_type = $ext;
        $batch->status = 'previewed';
        $batch->strategy = $strategy;
        $batch->mapping = $mapping;
        $batch->options = $options;
        $batch->total_rows = $total;
        $batch->valid_rows = $validRows;
        $batch->warning_rows = $warningRows;
        $batch->error_rows = $errorRows;
        // Persist only valid rows for the confirmed import phase (plus row number + warnings for reports).
        $data = [];
        foreach ($rows as $r) {
            if (isset($rowErrors[$r['row']])) {
                continue;
            }
            $entry = $r;
            $entry['warnings'] = $rowWarnings[$r['row']] ?? [];
            // Drop transient runtime flags from the persisted payload.
            foreach (['_errors', '_warnings', '_existing_product_id'] as $key) {
                unset($entry[$key]);
            }
            $data[] = $entry;
        }
        $batch->data = json_encode($data, JSON_UNESCAPED_UNICODE);

        // Error rows for reports, persisted so they survive the confirm step.
        $report = [];
        foreach ($rows as $r) {
            if (isset($rowErrors[$r['row']])) {
                $report[] = [
                    'row' => $r['row'],
                    'errors' => $rowErrors[$r['row']],
                ];
            }
        }
        $batch->results = json_encode(['batch_errors' => $report], JSON_UNESCAPED_UNICODE);
        $batch->save();

        $summary = [
            'total' => $batch->total_rows,
            'valid' => $batch->valid_rows,
            'warnings' => $batch->warning_rows,
            'errors' => $batch->error_rows,
            'estimated_products' => $estimatedProducts,
            'duplicates' => $dupInfo,
            'strategy' => $strategy,
            'mapping' => $batch->mapping,
            'warnings_list' => $this->collectWarnings($rows, $rowWarnings),
        ];

        return [$batch, $summary, $report];
    }

    protected function cleanHeaders(array $headers): array
    {
        return array_map(function ($h) {
            return trim((string) preg_replace('/\xEF\xBB\xBF/', '', (string) $h));
        }, $headers);
    }

    protected function applyMapping(array $rawRows, array $headers, array $mapping): array
    {
        // header index => canonical field
        $colMap = [];
        foreach ($headers as $idx => $header) {
            if ($mapping[$header] ?? '') {
                $colMap[$idx] = $mapping[$header];
            }
        }

        $out = [];
        foreach ($rawRows as $i => $row) {
            $assoc = [];
            foreach ($colMap as $idx => $field) {
                $assoc[$field] = is_array($row) ? trim((string) ($row[$idx] ?? '')) : '';
            }
            $assoc['row'] = $i + 2; // spreadsheet row number (1 = header)
            $out[] = $assoc;
        }

        return $out;
    }

    /**
     * Row-level validation. Returns [rows, errors[row=>[...]], warnings[row=>[...]]].
     */
    protected function validateRows(int $storeId, array $normalized, array $options): array
    {
        $rows = [];
        $errors = [];
        $warnings = [];

        $categories = $this->loadCategoriesIndexed($storeId);
        $createCategories = (bool) ($options['create_categories'] ?? false);
        $strategy = ($options['strategy'] ?? 'create_only') === 'update_by_sku' ? 'update_by_sku' : 'create_only';

        foreach ($normalized as $r) {
            $errs = [];
            $wrns = [];
            $rowNum = $r['row'];

            $name = trim($r['name'] ?? '');
            if ($name === '') {
                $errs[] = ['field' => 'name', 'reason' => __('اسم المنتج مطلوب')];
            } elseif (mb_strlen($name, 'UTF-8') > 255) {
                $errs[] = ['field' => 'name', 'reason' => __('اسم المنتج طويل جداً (255 حرف كحد أقصى)')];
            }

            if (isset($r['sku']) && trim((string) $r['sku']) !== '') {
                $sku = trim((string) $r['sku']);
                if (mb_strlen($sku, 'UTF-8') > 100) {
                    $errs[] = ['field' => 'sku', 'reason' => __('SKU طويل جداً (100 حرف كحد أقصى)')];
                }
                $r['sku'] = $sku;
            } else {
                $r['sku'] = '';
            }

            if (isset($r['barcode']) && trim((string) $r['barcode']) !== '') {
                $barcode = trim((string) $r['barcode']);
                if (mb_strlen($barcode, 'UTF-8') > 100) {
                    $errs[] = ['field' => 'barcode', 'reason' => __('الباركود طويل جداً (100 حرف كحد أقصى)')];
                }
                $r['barcode'] = $barcode;
            } else {
                $r['barcode'] = '';
            }

            if (isset($r['description']) && mb_strlen(trim((string) $r['description']), 'UTF-8') > 10000) {
                $errs[] = ['field' => 'description', 'reason' => __('الوصف طويل جداً (10000 حرف كحد أقصى)')];
            }

            // Price
            $price = $this->normalizeNumber($r['price'] ?? '');
            if ($price === '') {
                $r['_price_present'] = false;
                // In update_by_sku a missing price cell is fine (only mapped
                // fields are applied); for creates a price is mandatory.
                if ($strategy !== 'update_by_sku') {
                    $errs[] = ['field' => 'price', 'reason' => __('السعر مطلوب')];
                }
            } elseif (!is_numeric($price) || (float) $price < 0 || (float) $price > 9999999) {
                $errs[] = ['field' => 'price', 'reason' => __('السعر غير صالح')];
            } else {
                $r['_price_present'] = true;
            }

            // compare_at_price (sale price)
            $compare = $this->normalizeNumber($r['compare_at_price'] ?? '');
            if ($compare !== '' && $compare !== null && $compare !== false && $compare !== []) {
                if (!is_numeric($compare) || (float) $compare < 0 || (float) $compare > 9999999) {
                    $errs[] = ['field' => 'compare_at_price', 'reason' => __('سعر المقارنة غير صالح')];
                } elseif (is_numeric($price) && (float) $compare <= (float) $price) {
                    $wrns[] = ['field' => 'compare_at_price', 'reason' => __('سعر المقارنة أصغر من السعر أو مساوٍ له؛ سيتم تجاهله')];
                    $r['compare_at_price'] = '';
                }
            } else {
                $r['compare_at_price'] = '';
            }

            // Stock
            $stock = $this->normalizeNumber($r['stock'] ?? '');
            if ($stock === '' || $stock === null || $stock === false) {
                $r['stock'] = '0';
                $r['_stock_present'] = false;
            } elseif (!preg_match('/^\d+$/D', (string) $stock) || (int) $stock > 999999) {
                $errs[] = ['field' => 'stock', 'reason' => __('المخزون غير صالح (عدد صحيح غير سالب)')];
            } else {
                $r['_stock_present'] = true;
            }

            // Status
            $rawStatus = trim((string) ($r['status'] ?? ''));
            if ($rawStatus === '') {
                $r['_status_present'] = false;
            } else {
                $r['_status_present'] = true;
                $status = $this->normalizeStatus($rawStatus);
                if ($status === null) {
                    $errs[] = ['field' => 'status', 'reason' => __('قيمة الحالة غير صالحة (active أو inactive)')];
                }
            }

            // Category resolution (optional; uncategorized products are allowed).
            $catName = trim((string) ($r['category'] ?? ''));
            if ($catName === '') {
                $r['_category_present'] = false;
            } else {
                $r['_category_present'] = true;
                $catKey = mb_strtolower($catName, 'UTF-8');
                if (isset($categories[$catKey])) {
                    $r['category_id'] = $categories[$catKey];
                } elseif ($createCategories) {
                    // deferred to import time (creation happens inside the confirmed import)
                    $r['category_id'] = 0;
                    $r['category_pending'] = $catName;
                } else {
                    $errs[] = ['field' => 'category', 'reason' => __('التصنيف ":name" غير موجود', ['name' => $catName])];
                }
            }

            // image_url — conservative: store as reference string only (never fetched server-side).
            $image = trim((string) ($r['image_url'] ?? ''));
            if ($image !== '') {
                $scheme = strtolower((string) parse_url($image, PHP_URL_SCHEME));
                if (!in_array($scheme, ['http', 'https'], true)) {
                    $errs[] = ['field' => 'image_url', 'reason' => __('رابط الصورة غير صالح (يجب أن يكون http/https)')];
                } elseif (str_contains($image, '..') || str_contains($image, '<script') || str_contains($image, 'javascript:')) {
                    $errs[] = ['field' => 'image_url', 'reason' => __('رابط الصورة غير آمن')];
                } else {
                    $r['image_url'] = $image;
                }
            } else {
                $r['image_url'] = '';
            }

            // Variant fields consistency
            $o1Name = trim((string) ($r['option1_name'] ?? ''));
            $o1Value = trim((string) ($r['option1_value'] ?? ''));
            $o2Name = trim((string) ($r['option2_name'] ?? ''));
            $o2Value = trim((string) ($r['option2_value'] ?? ''));

            $hasVariantData = $o1Value !== '' || $o2Value !== '' || $o1Name !== '' || $o2Name !== '' || trim((string) ($r['variant_sku'] ?? '')) !== '' || trim((string) ($r['variant_price'] ?? '')) !== '' || trim((string) ($r['variant_stock'] ?? '')) !== '';

            if ($hasVariantData) {
                if ($o1Value === '' && $o2Value === '') {
                    $errs[] = ['field' => 'option1_value', 'reason' => __('يوجد عمود خاص بالمتغيرات لكن قيمة الخيار الأول غير محددة')];
                }
                if ($o1Value === '' && $o2Value !== '' && $o2Name === '') {
                    $errs[] = ['field' => 'option2_name', 'reason' => __('اسم الخيار الثاني مطلوب عند استخدام قيمة الخيار الثاني')];
                }
                if (($o1Value !== '' && $o1Name === '') || ($o2Value !== '' && $o2Name === '')) {
                    $wrns[] = ['field' => 'option_name', 'reason' => __('اسم إحدى مجموعات الخيارات غير محدد؛ سيتم استخدام اسم افتراضي')];
                }
                $vp = $this->normalizeNumber($r['variant_price'] ?? '');
                if ($vp !== '' && $vp !== null && $vp !== false && !is_numeric($vp)) {
                    $errs[] = ['field' => 'variant_price', 'reason' => __('سعر المتغير غير صالح')];
                }
                $vs = $this->normalizeNumber($r['variant_stock'] ?? '');
                if ($vs !== '' && $vs !== null && $vs !== false && !preg_match('/^\d+$/D', (string) $vs)) {
                    $errs[] = ['field' => 'variant_stock', 'reason' => __('مخزون المتغير غير صالح')];
                }
            }

            // strategy-specific checks happen at product level (detectSkuIssues)

            $r['_errors'] = $errs;
            $r['_warnings'] = $wrns;
            $rows[] = $r;
            if (count($errs) > 0) {
                $errors[$rowNum] = $errs;
            }
            if (count($wrns) > 0) {
                $warnings[$rowNum] = $wrns;
            }
        }

        return [$rows, $errors, $warnings];
    }

    /**
     * Product-level duplicate handling scoped to the store:
     * - duplicate SKUs inside the file -> error on later occurrences;
     * - SKU already present in THIS store -> error (create_only) / marked for update (update_by_sku).
     */
    protected function detectSkuIssues(int $storeId, array $rows, array $errors, array $warnings, array $options): array
    {
        $strategy = ($options['strategy'] ?? 'create_only') === 'update_by_sku' ? 'update_by_sku' : 'create_only';
        $duplicates = [];

        $skus = [];
        foreach ($rows as $i => $r) {
            $sku = trim((string) ($r['sku'] ?? ''));
            if ($sku === '') {
                continue;
            }
            // Variant rows legitimately repeat the base product SKU — only flag
            // duplicate SKUs between non-variant rows.
            if (trim((string) ($r['option1_value'] ?? '')) !== '' || trim((string) ($r['option2_value'] ?? '')) !== '') {
                continue;
            }
            if (isset($skus[$sku])) {
                $errors[$r['row']][] = ['field' => 'sku', 'reason' => __('SKU مكرر في الملف نفسه (الصف :row)', ['row' => $skus[$sku]])];
                $duplicates[$sku] = ($duplicates[$sku] ?? 0) + 1;
            } else {
                $skus[$sku] = $r['row'];
            }
        }

        $existingBySku = [];
        if (count($skus) > 0) {
            $existingBySku = Product::where('store_id', $storeId)
                ->whereIn('sku', array_keys($skus))
                ->whereNotNull('sku')
                ->where('sku', '!=', '')
                ->pluck('id', 'sku')
                ->all();
        }

        foreach ($rows as $i => $r) {
            $sku = trim((string) ($r['sku'] ?? ''));
            if ($sku === '' || !isset($existingBySku[$sku])) {
                continue;
            }
            if ($strategy === 'update_by_sku') {
                $r['_existing_product_id'] = (int) $existingBySku[$sku];
                $rows[$i] = $r;
                continue;
            }
            // create_only: must not overwrite.
            $errors[$r['row']][] = ['field' => 'sku', 'reason' => __('SKU مستخدم مسبقاً')];
        }

        return [$rows, $errors, $warnings, array_keys($duplicates)];
    }

    protected function estimateProducts(array $rows, array $errors): int
    {
        $groups = [];
        foreach ($rows as $r) {
            if (isset($errors[$r['row']])) {
                continue;
            }
            $key = mb_strtolower(trim((string) $r['name']), 'UTF-8');
            $groups[$key] = true;
        }

        return count($groups);
    }

    protected function collectWarnings(array $rows, array $rowWarnings): array
    {
        $out = [];
        foreach ($rows as $r) {
            foreach ($rowWarnings[$r['row']] ?? [] as $w) {
                $out[] = ['row' => $r['row'], 'field' => $w['field'], 'reason' => $w['reason']];
            }
        }

        return $out;
    }

    /* ------------------------------------------------------------------ */
    /* Confirmed import                                                   */
    /* ------------------------------------------------------------------ */

    /**
     * Execute a confirmed import for a previewed batch (idempotent claim).
     *
     * @return array{status: string, ...summary}
     */
    public function confirmImport(User $user, int $storeId, ProductImportBatch $batch, string $strategy): array
    {
        if ($batch->store_id !== $storeId) {
            throw new \RuntimeException(__('هذه الدفعة لا تنتمي إلى متجرك.'));
        }

        // Atomic idempotency claim: only a 'previewed' batch can transition to 'processing'.
        $claimed = ProductImportBatch::where('id', $batch->id)
            ->where('store_id', $storeId)
            ->where('status', 'previewed')
            ->update(['status' => 'processing']);

        if (!$claimed) {
            // Already claimed before we got here.
            $fresh = ProductImportBatch::where('id', $batch->id)->where('store_id', $storeId)->first();

            return $this->resultFor($fresh);
        }

        $batch->strategy = $strategy === 'update_by_sku' ? 'update_by_sku' : 'create_only';
        $batch->save();

        try {
            $result = DB::transaction(function () use ($user, $storeId, $batch) {
                $rows = $batch->decoded_data;
                if (count($rows) === 0) {
                    return ['created' => 0, 'updated' => 0, 'failed' => 0, 'results' => [], 'reasons' => []];
                }

                return $this->executeRows($user, $storeId, $batch, $rows);
            });

            $batch->created_count = $result['created'];
            $batch->updated_count = $result['updated'];
            $batch->failed_count = $result['failed'];
            $previous = $batch->decoded_results;
            $batch->results = json_encode([
                'batch_errors' => $previous['batch_errors'] ?? [],
                'rows' => $result['results'],
            ], JSON_UNESCAPED_UNICODE);
            $batch->status = $result['failed'] > 0 ? 'completed_with_errors' : 'completed';
            $batch->completed_at = now();
            $batch->save();
        } catch (\Throwable $e) {
            $batch->status = 'failed';
            $batch->error_message = substr(__('فشل الاستيراد: ') . $e->getMessage(), 0, 2000);
            $batch->save();

            return ['status' => 'failed', 'message' => $batch->error_message];
        }

        return $this->resultFor($batch);
    }

    /**
     * Group validated rows into products and persist through the canonical model.
     */
    protected function executeRows(User $user, int $storeId, ProductImportBatch $batch, array $rows): array
    {
        $strategy = $batch->strategy;
        $options = $batch->options ?? [];
        $createCategories = (bool) ($options['create_categories'] ?? false);

        $created = 0;
        $updated = 0;
        $failed = 0;
        $results = [];
        $failureReasons = [];

        // Tenant-scoped category index; lazily extended when creating categories.
        $categories = $this->loadCategoriesIndexed($storeId);
        $pendingCategories = [];
        $categoriesByName = $categories;

        $groups = $this->groupByProduct($rows);

        // Capacity planning (no bypass of plan limits).
        $capacity = $this->remainingCapacity($user, $storeId, $strategy);
        $plannedCreates = 0;

        foreach ($groups as $group) {
            $first = $group[0];
            $sku = $this->productSkuOf($group);
            $rowNumbers = array_column($group, 'row');

            // Build the normalized product payload (common to create/update).
            $payload = $this->normalizeProductPayload($group, $categoriesByName, $storeId, $createCategories);

            if ($payload['_error']) {
                foreach ($rowNumbers as $rn) {
                    $failed++;
                    $results[] = ['row' => $rn, 'status' => 'failed', 'field' => $payload['_error_field'] ?? 'product', 'reason' => $payload['_error']];
                }
                $failureReasons[$payload['_error']] = true;
                continue;
            }

            $existingId = null;
            if ($strategy === 'update_by_sku' || ($strategy === 'create_only' && $sku !== '')) {
                $existingId = Product::where('store_id', $storeId)
                    ->where('sku', $sku)
                    ->whereNotNull('sku')
                    ->where('sku', '!=', '')
                    ->value('id');
            }

            $isCreate = $existingId === null;
            if ($isCreate && $strategy === 'update_by_sku') {
                foreach ($rowNumbers as $rn) {
                    $failed++;
                    $results[] = ['row' => $rn, 'status' => 'failed', 'field' => 'sku', 'reason' => __('لا يوجد منتج بهذا SKU في متجرك')];
                }
                $failureReasons['sku_not_found'] = true;
                continue;
            }

            // create_only must never overwrite an existing store product.
            if (!$isCreate && $strategy === 'create_only') {
                foreach ($rowNumbers as $rn) {
                    $failed++;
                    $results[] = ['row' => $rn, 'status' => 'failed', 'field' => 'sku', 'reason' => __('SKU مستخدم مسبقاً')];
                }
                $failureReasons['sku_exists'] = true;
                continue;
            }

            if ($isCreate) {
                if ($capacity !== null && $capacity['max'] > 0) {
                    if ($plannedCreates >= $capacity['remaining']) {
                        foreach ($rowNumbers as $rn) {
                            $failed++;
                            $results[] = ['row' => $rn, 'status' => 'failed', 'field' => 'plan', 'reason' => __('تم الوصول إلى الحد الأقصى للمنتجات في خطتك (:max لكل متجر)؛ رقِّ خطتك أولاً.', ['max' => $capacity['max']])];
                        }
                        $failureReasons['plan_limit'] = true;
                        continue;
                    }
                }
                $plannedCreates++;

                // Category auto-creation happens only for confirmed imports.
                if ($createCategories && !empty($payload['category_pending'])) {
                    $catName = $payload['category_pending'];
                    $catKey = mb_strtolower($catName, 'UTF-8');
                    if (!isset($categoriesByName[$catKey])) {
                        $cat = Category::create([
                            'store_id' => $storeId,
                            'name' => $catName,
                            'slug' => Category::generateUniqueSlug($catName, $storeId),
                            'is_active' => true,
                        ]);
                        $categoriesByName[$catKey] = $cat->id;
                        $pendingCategories[$catKey] = true;
                    }
                    $payload['category_id'] = $categoriesByName[$catKey];
                }

                $product = new Product();
                $this->hydrateProduct($product, $payload);
                $product->store_id = $storeId;
                $product->save();

                $created++;
                foreach ($rowNumbers as $rn) {
                    $results[] = ['row' => $rn, 'status' => 'created', 'field' => '', 'reason' => '', 'product_id' => $product->id];
                }
                continue;
            }

            // Update path: only touch fields the import actually mapped/provided.
            $product = Product::where('store_id', $storeId)->where('id', $existingId)->first();
            if (!$product) {
                foreach ($rowNumbers as $rn) {
                    $failed++;
                    $results[] = ['row' => $rn, 'status' => 'failed', 'field' => 'sku', 'reason' => __('لا يوجد منتج بهذا SKU في متجرك')];
                }
                continue;
            }

            $this->hydrateProductUpdate($product, $payload);
            $product->save();

            $updated++;
            foreach ($rowNumbers as $rn) {
                $results[] = ['row' => $rn, 'status' => 'updated', 'field' => '', 'reason' => '', 'product_id' => $product->id];
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'failed' => $failed,
            'results' => $results,
            'reasons' => array_keys($failureReasons),
            'pending_categories' => count($pendingCategories),
        ];
    }

    /**
     * Group rows by product identity. SKU takes priority (variant rows share the
     * base SKU); otherwise fall back to the case-insensitive product name.
     */
    protected function groupByProduct(array $rows): array
    {
        $groups = [];
        $order = [];
        foreach ($rows as $r) {
            $sku = trim((string) ($r['sku'] ?? ''));
            $key = $sku !== '' ? 's:' . mb_strtolower($sku, 'UTF-8') : 'n:' . mb_strtolower(trim((string) ($r['name'] ?? '')), 'UTF-8');
            if (!isset($groups[$key])) {
                $groups[$key] = [];
                $order[] = $key;
            }
            $groups[$key][] = $r;
        }
        $out = [];
        foreach ($order as $key) {
            $out[] = $groups[$key];
        }

        return $out;
    }

    protected function productSkuOf(array $group): string
    {
        foreach ($group as $r) {
            if (!empty(trim((string) ($r['sku'] ?? '')))) {
                return trim((string) $r['sku']);
            }
        }

        return '';
    }

    /**
     * Build the canonical payload for a product group. Returns payload array;
     * on unrecoverable error sets `_error` (+ `_error_field`).
     */
    protected function normalizeProductPayload(array $group, array $categoriesByName, int $storeId, bool $createCategories): array
    {
        $first = $group[0];
        $out = ['_error' => null, '_error_field' => null];

        $name = trim((string) ($first['name'] ?? ''));
        if ($name === '') {
            $out['_error'] = __('اسم المنتج مطلوب');
            $out['_error_field'] = 'name';

            return $out;
        }
        $out['name'] = $name;
        $out['sku'] = $this->productSkuOf($group) ?: null;
        $out['barcode'] = trim((string) ($first['barcode'] ?? '')) !== '' ? trim((string) $first['barcode']) : null;
        $out['description'] = trim((string) ($first['description'] ?? '')) !== '' ? trim((string) $first['description']) : null;
        $out['price'] = (float) $this->normalizeNumber($first['price'] ?? '');

        $compare = $this->normalizeNumber($first['compare_at_price'] ?? '');
        if (is_numeric($compare) && (float) $compare > 0 && (float) $compare < $out['price']) {
            $out['sale_price'] = (float) $compare;
        } else {
            $out['sale_price'] = null;
        }

        $out['is_active'] = $this->normalizeStatus($first['status'] ?? '') ?? true;

        // Image: single reference URL (never fetched server-side).
        $image = trim((string) ($first['image_url'] ?? ''));
        if ($image === '') {
            // Fall back to scraping any image listed in other rows of the group.
            foreach ($group as $r) {
                if (trim((string) ($r['image_url'] ?? '')) !== '') {
                    $image = trim((string) $r['image_url']);
                    break;
                }
            }
        }
        $out['images'] = $image;
        $out['cover_image'] = $image;

        // Category (optional)
        $category = trim((string) ($first['category'] ?? ''));
        $stockMapped = false;
        $priceMapped = false;
        $statusMapped = false;
        foreach ($group as $r) {
            if (!empty($r['_stock_present'])) {
                $stockMapped = true;
            }
            if (!empty($r['_price_present'])) {
                $priceMapped = true;
            }
            if (!empty($r['_status_present'])) {
                $statusMapped = true;
            }
        }
        $out['_stock_mapped'] = $stockMapped;
        $out['_price_mapped'] = $priceMapped;
        $out['_status_mapped'] = $statusMapped;

        if ($category === '') {
            $out['category_id'] = null;
        } else {
            $catKey = mb_strtolower($category, 'UTF-8');
            if (isset($categoriesByName[$catKey])) {
                $out['category_id'] = $categoriesByName[$catKey];
            } elseif ($createCategories) {
                $out['category_pending'] = $category;
                $out['category_id'] = 0;
            } else {
                $out['_error'] = __('التصنيف ":name" غير موجود', ['name' => $category]);
                $out['_error_field'] = 'category';

                return $out;
            }
        }

        // Variant aggregation
        $option1Name = '';
        $option2Name = '';
        $o1Values = [];
        $o2Values = [];
        $comboSet = [];

        foreach ($group as $r) {
            $o1v = trim((string) ($r['option1_value'] ?? ''));
            $o2v = trim((string) ($r['option2_value'] ?? ''));
            if ($o1v === '' && $o2v === '') {
                continue;
            }
            if ($o1v !== '') {
                $name1 = trim((string) ($r['option1_name'] ?? ''));
                $option1Name = $name1 !== '' ? $name1 : $option1Name;
                if (!in_array($o1v, $o1Values, true)) {
                    $o1Values[] = $o1v;
                }
            }
            if ($o2v !== '') {
                $name2 = trim((string) ($r['option2_name'] ?? ''));
                $option2Name = $name2 !== '' ? $name2 : $option2Name;
                if (!in_array($o2v, $o2Values, true)) {
                    $o2Values[] = $o2v;
                }
            }

            $values = array_values(array_filter([$o1v, $o2v], fn ($v) => $v !== ''));
            $comboId = implode('‖', $values);

            $vp = $this->normalizeNumber($r['variant_price'] ?? '');
            $vs = $this->normalizeNumber($r['variant_stock'] ?? '');

            if (isset($comboSet[$comboId])) {
                // Duplicate combination in file: merge stock.
                $comboSet[$comboId]['stock'] = (string) ((int) ($comboSet[$comboId]['stock'] ?? 0) + (int) $vs);
                continue;
            }

            $comboSet[$comboId] = [
                'values' => $values,
                'price' => is_numeric($vp) ? (string) (float) $vp : '',
                'sku' => trim((string) ($r['variant_sku'] ?? '')),
                'stock' => $vs === '' ? '0' : (string) (int) $vs,
            ];
        }

        $hasVariants = count($comboSet) > 0;
        if ($hasVariants) {
            $variants = [];
            if ($option1Name === '' && $o1Values) {
                $option1Name = __('الخيار الأول');
            }
            if ($option2Name === '' && $o2Values) {
                $option2Name = __('الخيار الثاني');
            }
            if ($o1Values) {
                $variants[] = ['name' => $option1Name, 'values' => $o1Values];
            }
            if ($o2Values) {
                $variants[] = ['name' => $option2Name, 'values' => $o2Values];
            }

            // Deterministic combo ordering: option1 first then option2.
            $combos = [];
            $sortKey = [];
            foreach ($comboSet as $id => $c) {
                $sortKey[$id] = implode('|', array_map('strval', $c['values']));
                $combos[$id] = $c;
            }
            uasort($combos, function ($a, $b) {
                return strcmp(implode('|', array_map('strval', $a['values'])), implode('|', array_map('strval', $b['values'])));
            });

            $finalCombos = [];
            foreach ($combos as $c) {
                $finalCombos[] = $c;
            }
            $finalCombos = Product::ensureVariantUuids($finalCombos);

            $out['variants'] = $variants;
            $out['variant_combinations'] = $finalCombos;
            $out['inventory_mode'] = 'variant';
            $out['stock'] = array_sum(array_map(fn ($c) => (int) ($c['stock'] ?? 0), $finalCombos));
        } else {
            $out['variants'] = [];
            $out['variant_combinations'] = [];
            $out['inventory_mode'] = 'product';
            $out['stock'] = (int) ($first['stock'] ?? 0);
        }

        // Canonical inventory defaults.
        $out['track_inventory'] = true;
        $out['allow_backorder'] = false;
        $out['low_stock_warning'] = 5;

        return $out;
    }

    protected function hydrateProduct(Product $product, array $payload): void
    {
        $product->name = $payload['name'];
        $product->sku = $payload['sku'];
        $product->barcode = $payload['barcode'];
        $product->description = $payload['description'];
        $product->price = $payload['price'];
        $product->sale_price = $payload['sale_price'];
        $product->stock = $payload['stock'];
        $product->category_id = $payload['category_id'] ? (int) $payload['category_id'] : null;
        $product->is_active = (bool) $payload['is_active'];
        $product->track_inventory = (bool) $payload['track_inventory'];
        $product->allow_backorder = (bool) $payload['allow_backorder'];
        $product->low_stock_warning = (int) $payload['low_stock_warning'];
        $product->inventory_mode = $payload['inventory_mode'];
        $product->images = $payload['images'];
        $product->cover_image = $payload['cover_image'];
        $product->variants = $payload['variants'];
        $product->variant_combinations = $payload['variant_combinations'];
    }

    /**
     * Update path: only mapped/non-empty fields are written. Empty optional
     * fields in the import never blank unrelated existing data.
     */
    protected function hydrateProductUpdate(Product $product, array $payload): void
    {
        $product->name = $payload['name'];
        if ($payload['sku'] !== null && $payload['sku'] !== '') {
            $product->sku = $payload['sku'];
        }
        if ($payload['barcode'] !== null && $payload['barcode'] !== '') {
            $product->barcode = $payload['barcode'];
        }
        if ($payload['description'] !== null && $payload['description'] !== '') {
            $product->description = $payload['description'];
        }
        if ($payload['_price_mapped']) {
            $product->price = $payload['price'];
        }
        if ($payload['sale_price'] !== null) {
            $product->sale_price = $payload['sale_price'];
        }
        if ($payload['images'] !== '') {
            $product->images = $payload['images'];
            $product->cover_image = $payload['cover_image'];
        }
        if ((int) $payload['category_id'] > 0) {
            $product->category_id = (int) $payload['category_id'];
        }
        if (count($payload['variants'] ?? []) > 0 || count($payload['variant_combinations'] ?? []) > 0) {
            $product->variants = $payload['variants'];
            $product->variant_combinations = $payload['variant_combinations'];
            $product->inventory_mode = $payload['inventory_mode'];
        }
        // Stock handling: simple products only overwrite stock when the import
        // actually mapped/populated a stock cell; variant products keep the
        // canonical combo stock (already merged into payload).
        if (count($payload['variant_combinations'] ?? []) > 0) {
            $product->stock = $payload['stock'];
        } elseif ($payload['_stock_mapped']) {
            $product->stock = $payload['stock'];
        }
        if ($payload['_status_mapped']) {
            $product->is_active = (bool) $payload['is_active'];
        }
    }

    protected function remainingCapacity(User $user, int $storeId, string $strategy): ?array
    {
        $company = $user->type === 'company' ? $user : $user->creator;
        if (!$company || !$company->plan) {
            return ['max' => 0, 'remaining' => PHP_INT_MAX];
        }
        $max = (int) ($company->plan->max_products_per_store ?? 0);
        if ($max <= 0) {
            return ['max' => 0, 'remaining' => PHP_INT_MAX];
        }
        $current = Product::where('store_id', $storeId)->count();

        return ['max' => $max, 'remaining' => max(0, $max - $current)];
    }

    /* ------------------------------------------------------------------ */
    /* Error report export                                                */
    /* ------------------------------------------------------------------ */

    /**
     * Stream a CSV error report for a batch (store-scoped).
     */
    public function errorReport(ProductImportBatch $batch): \Closure
    {
        $rows = $batch->decoded_data;
        $results = $batch->decoded_results;

        // Union: rows rejected at preview (they never reached `data`) need the
        // error rows — recompute from the persisted error report stored in `results.batch_errors`.
        $previewErrors = $results['batch_errors'] ?? [];

        $byRow = [];
        foreach ($previewErrors as $e) {
            $byRow[$e['row']] = $e['errors'];
        }
        // Import-time failures.
        foreach ($results['rows'] ?? [] as $r) {
            if ($r['status'] === 'failed') {
                $byRow[$r['row']] = $byRow[$r['row']] ?? [];
                $byRow[$r['row']][] = ['field' => $r['field'], 'reason' => $r['reason']];
            }
        }

        ksort($byRow);

        return function () use ($byRow) {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF");
            fputcsv($file, ['رقم الصف', 'الحقل', 'السبب']);
            foreach ($byRow as $rowNum => $errs) {
                foreach ($errs as $err) {
                    $safeRow = $this->csvSafe((string) $rowNum);
                    $safeField = $this->csvSafe((string) ($err['field'] ?? ''));
                    $safeReason = $this->csvSafe((string) ($err['reason'] ?? ''));
                    fputcsv($file, [$safeRow, $safeField, $safeReason]);
                }
            }
            fclose($file);
        };
    }

    /**
     * Formula-injection guard: lead dangerous cells with a single quote so they
     * cannot execute as spreadsheet formulas when the report is opened.
     */
    protected function csvSafe(string $value): string
    {
        if ($value === '') {
            return $value;
        }
        $first = $value[0];
        if ($first === '=' || $first === '+' || $first === '-' || $first === '@' || $first === "\t" || $first === "\r") {
            return "'" . $value;
        }

        return $value;
    }

    /* ------------------------------------------------------------------ */
    /* Helpers                                                            */
    /* ------------------------------------------------------------------ */

    protected function loadCategoriesIndexed(int $storeId): array
    {
        return Category::where('store_id', $storeId)
            ->get(['id', 'name'])
            ->keyBy(fn ($c) => mb_strtolower(trim((string) $c->name), 'UTF-8'))
            ->map(fn ($c) => (int) $c->id)
            ->all();
    }

    /**
     * Normalize numeric input: Arabic-Indic/Persian digits, Arabic decimal
     * separators, thousands separators, whitespace. Returns '' when empty.
     */
    protected function normalizeNumber($value): string
    {
        if ($value === null) {
            return '';
        }
        $value = trim((string) $value);
        $value = str_replace(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'], ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], $value);
        $value = str_replace(['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'], ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], $value);
        $value = str_replace('٫', '.', $value); // Arabic decimal separator
        $value = str_replace('٬', ',', $value);
        $value = str_replace(' ', '', $value);

        if ($value === '') {
            return '';
        }

        // Thousands separator heuristics.
        if (substr_count($value, ',') >= 1 && substr_count($value, '.') >= 1) {
            $value = str_replace(',', '', $value);
        } elseif (preg_match('/^\d{1,3}(,\d{3})+(\.\d+)?$/', $value)) {
            $value = str_replace(',', '', $value);
        } elseif (substr_count($value, ',') === 1 && !preg_match('/^\d{1,3}(,\d{3})$/', $value)) {
            $value = str_replace(',', '.', $value);
        }

        return (string) $value;
    }

    protected function normalizeStatus($value): ?bool
    {
        $v = mb_strtolower(trim((string) $value), 'UTF-8');
        if (in_array($v, ['', 'active', '1', 'true', 'yes', 'published', 'in_stock', 'متاح', 'مفعل', 'نشط', 'منشور', 'فعال'], true)) {
            return true;
        }
        if (in_array($v, ['inactive', '0', 'false', 'no', 'draft', 'out_of_stock', 'مخفي', 'غير مفعل', 'مسودة', 'غير متاح'], true)) {
            return false;
        }

        return null;
    }

    protected function resultFor(?ProductImportBatch $batch): array
    {
        if (!$batch) {
            return ['status' => 'missing'];
        }

        return [
            'status' => $batch->status,
            'batch_id' => $batch->id,
            'total_rows' => $batch->total_rows,
            'created' => $batch->created_count,
            'updated' => $batch->updated_count,
            'failed' => $batch->failed_count,
            'completed_at' => $batch->completed_at ? $batch->completed_at->toDateTimeString() : null,
            'message' => $this->resultMessage($batch),
        ];
    }

    protected function resultMessage(ProductImportBatch $batch): string
    {
        return match ($batch->status) {
            'completed' => __('تم استيراد :count منتجاً بنجاح', ['count' => $batch->created_count]),
            'completed_with_errors' => __('تم استيراد :created منتجاً بنجاح، وفشل :failed صفاً.', ['created' => $batch->created_count, 'failed' => $batch->failed_count]),
            'failed' => __('فشل الاستيراد'),
            default => __('قيد المعالجة'),
        };
    }
}