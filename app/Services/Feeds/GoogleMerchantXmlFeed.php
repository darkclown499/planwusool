<?php

namespace App\Services\Feeds;

use XMLWriter;

/**
 * Google Merchant Center product feed serializer.
 *
 * Memory-safe streaming serializer. The feed document is opened against an
 * output stream (php://output by default) and items are written one at a time
 * via addItem(), so an arbitrarily large catalog never accumulates as a single
 * in-memory string. This matches Laravel's streaming response pattern.
 *
 * All merchant-controlled content is written through XMLWriter element/value
 * APIs, which perform correct escaping (no unsafe string concatenation, no
 * XML injection). Output is UTF-8, safe for Arabic.
 */
class GoogleMerchantXmlFeed
{
    /** @var XMLWriter|null */
    protected $writer;

    /**
     * Open the feed document. A memory-backed XMLWriter is used and its output
     * is echoed into the current output stream via flush() after each step, so
     * an arbitrarily large catalog is never held in memory as one string while
     * still being written to a streaming response.
     */
    public function open(): void
    {
        $this->writer = new XMLWriter();
        $this->writer->openMemory();
        $this->writer->startDocument('1.0', 'UTF-8');
        $this->writer->startElement('rss');
        $this->writer->writeAttribute('version', '2.0');
        $this->writer->writeAttribute('xmlns:g', 'http://base.google.com/ns/1.0');
        $this->writer->startElement('channel');
        $this->writer->writeElement('title', 'Wusool Product Feed');
        $this->writer->writeElement('link', 'https://wusool.ps');
        $this->writer->writeElement('description', 'Wusool product catalog feed');
        $this->flush();
    }

    /**
     * Write one normalized feed item as an XML <item>.
     */
    public function addItem(array $item): void
    {
        $writer = $this->writer;
        $writer->startElement('item');

        $writer->startElement('g:id');
        $writer->text((string) $item['id']);
        $writer->endElement();

        if (!empty($item['item_group_id'])) {
            $writer->startElement('g:item_group_id');
            $writer->text((string) $item['item_group_id']);
            $writer->endElement();
        }

        $writer->startElement('g:title');
        $writer->text((string) $item['title']);
        $writer->endElement();

        $writer->startElement('g:description');
        $writer->text((string) $item['description']);
        $writer->endElement();

        $writer->startElement('g:link');
        $writer->text((string) $item['link']);
        $writer->endElement();

        $writer->startElement('g:image_link');
        $writer->text((string) $item['image_link']);
        $writer->endElement();

        foreach (($item['additional_image_links'] ?? []) as $extraImage) {
            $writer->startElement('g:additional_image_link');
            $writer->text((string) $extraImage);
            $writer->endElement();
        }

        $writer->startElement('g:availability');
        $writer->text((string) $item['availability']);
        $writer->endElement();

        $writer->startElement('g:price');
        $writer->text((string) $item['price']);
        $writer->endElement();

        if (!empty($item['sale_price'])) {
            $writer->startElement('g:sale_price');
            $writer->text((string) $item['sale_price']);
            $writer->endElement();
        }

        $writer->startElement('g:condition');
        $writer->text((string) $item['condition']);
        $writer->endElement();

        if (!empty($item['brand'])) {
            $writer->startElement('g:brand');
            $writer->text((string) $item['brand']);
            $writer->endElement();
        }

        if (!empty($item['gtin'])) {
            $writer->startElement('g:gtin');
            $writer->text((string) $item['gtin']);
            $writer->endElement();
        }

        if (!empty($item['mpn'])) {
            $writer->startElement('g:mpn');
            $writer->text((string) $item['mpn']);
            $writer->endElement();
        }

        if (!empty($item['sku'])) {
            $writer->startElement('g:sku');
            $writer->text((string) $item['sku']);
            $writer->endElement();
        }

        $writer->startElement('g:identifier_exists');
        $writer->text($this->identifierExists($item));
        $writer->endElement();

        if (!empty($item['product_type'])) {
            $writer->startElement('g:product_type');
            $writer->text((string) $item['product_type']);
            $writer->endElement();
        }

        $writer->endElement(); // item

        $this->flush();
    }

    /**
     * Echo the current in-memory XMLWriter buffer and clear it. This keeps peak
     * memory bounded to a single feed item regardless of catalog size.
     */
    protected function flush(): void
    {
        if ($this->writer) {
            echo $this->writer->outputMemory(true);
        }
    }

    /**
     * Close the feed document and flush the final stream.
     */
    public function close(): void
    {
        if (!$this->writer) {
            return;
        }
        $this->writer->endElement(); // channel
        $this->writer->endElement(); // rss
        $this->writer->endDocument();
        $this->flush();
    }

    /**
     * Google expects identifier_exists as TRUE/FALSE (capitalised). Reflects
     * whether real GTIN/MPN exist — we never fabricate identifiers.
     */
    protected function identifierExists(array $item): string
    {
        $gtin = (string) ($item['gtin'] ?? '');
        $mpn = (string) ($item['mpn'] ?? '');
        return ($gtin !== '' || $mpn !== '') ? 'TRUE' : 'FALSE';
    }
}
