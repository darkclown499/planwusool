<?php

namespace Tests\Feature;

use App\Services\ImageDownloader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Security tests for the SSRF-safe remote image downloader used by
 * product import media ingestion. All fetches are HTTP faked — no
 * uncontrolled internet calls.
 */
class ImageDownloaderTest extends TestCase
{
    use RefreshDatabase;

    /** 1x1 transparent PNG — valid image content with a real PNG signature. */
    private const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function pngBody(): string
    {
        return base64_decode(self::PNG_B64, true);
    }

    private function fakeImage(string $url, string $body = null): void
    {
        Http::fake([
            $url => Http::response($body ?? $this->pngBody(), 200, ['Content-Type' => 'image/png']),
        ]);
    }

    /* ---------------------- SSRF host rejection ---------------------- */

    public function test_rejects_localhost(): void
    {
        $this->fakeImage('http://localhost/x.png');
        $result = (new ImageDownloader())->download('http://localhost/x.png', 1);
        $this->assertArrayHasKey('error', $result);
    }

    public function test_rejects_loopback_ip(): void
    {
        $this->fakeImage('http://127.0.0.1/x.png');
        $this->assertArrayHasKey('error', (new ImageDownloader())->download('http://127.0.0.1/x.png', 1));
        $this->fakeImage('http://127.0.0.2/x.png');
        $this->assertArrayHasKey('error', (new ImageDownloader())->download('http://127.0.0.2/x.png', 1));
    }

    public function test_rejects_private_ip(): void
    {
        foreach (['http://192.168.1.1/x.png', 'http://10.0.0.1/x.png', 'http://172.16.0.1/x.png'] as $url) {
            $this->fakeImage($url);
            $this->assertArrayHasKey('error', (new ImageDownloader())->download($url, 1), "should block $url");
        }
    }

    public function test_rejects_metadata_endpoint(): void
    {
        $url = 'http://169.254.169.254/latest/meta-data/';
        $this->fakeImage($url);
        $this->assertArrayHasKey('error', (new ImageDownloader())->download($url, 1));
    }

    public function test_rejects_non_http_schemes(): void
    {
        $downloader = new ImageDownloader();
        foreach (['file:///etc/passwd', 'ftp://example.com/x.png', 'javascript:alert(1)', 'data:image/png;base64,abc'] as $url) {
            $this->assertTrue($downloader->isBlockedUrl($url), "should block $url");
        }
    }

    public function test_blocks_hosts_in_private_namespaces(): void
    {
        // Hostnames in private/reserved namespaces must be blocked even when
        // DNS cannot resolve them (no nameserver dependency — deterministic).
        $downloader = new ImageDownloader();
        foreach (['http://192-168-1-1.internal/x.png', 'http://localhost.test/x.png', 'http://nonexistent.internal/x.png', 'http://printer.lan/x.png'] as $url) {
            $this->assertTrue($downloader->isBlockedUrl($url), "should block $url");
        }

        // Integer/hex-encoded loopback forms that bypass FILTER_VALIDATE_IP.
        $this->assertTrue($downloader->isBlockedUrl('http://2130706433/x.png'));
        $this->assertTrue($downloader->isBlockedUrl('http://0x7f000001/x.png'));
        $this->assertTrue($downloader->isBlockedUrl('http://0177.0.0.1/x.png'));

        // A public-looking hostname is allowed.
        $this->assertFalse($downloader->isBlockedUrl('https://api.example.com/v1/x.png'));
    }

    /* ---------------------- redirect defense ---------------------- */

    public function test_rejects_redirect_to_private_host_without_requesting_it(): void
    {
        Http::fake([
            'https://public.example/img.png' => Http::response('redirect', 302, ['Location' => 'http://127.0.0.1/evil.png']),
            'http://127.0.0.1/*' => Http::response($this->pngBody(), 200, ['Content-Type' => 'image/png']),
        ]);

        $result = (new ImageDownloader())->download('https://public.example/img.png', 1);
        $this->assertArrayHasKey('error', $result);

        // The private target must never have been requested.
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '127.0.0.1'));
    }

    public function test_follows_redirect_to_public_host(): void
    {
        Http::fake([
            'https://public.example/img.png' => Http::response('redirect', 302, ['Location' => 'https://cdn.example.com/real.png']),
            'https://cdn.example.com/real.png' => Http::response($this->pngBody(), 200, ['Content-Type' => 'image/png']),
        ]);

        $result = (new ImageDownloader())->download('https://public.example/img.png', 7);
        $this->assertArrayHasKey('path', $result);
        $this->assertStringStartsWith('products/7/', $result['path']);
        Http::assertSent(fn ($request) => str_contains($request->url(), 'cdn.example.com'));
    }

    public function test_rejects_excessive_redirects(): void
    {
        Http::fake([
            'https://public.example/img.png' => Http::response('redirect', 302, ['Location' => 'https://public.example/img2.png']),
            'https://public.example/img2.png' => Http::response('redirect', 302, ['Location' => 'https://public.example/img3.png']),
            'https://public.example/img3.png' => Http::response('redirect', 302, ['Location' => 'https://public.example/img4.png']),
            'https://public.example/img4.png' => Http::response('redirect', 302, ['Location' => 'https://public.example/img5.png']),
            'https://public.example/img5.png' => Http::response($this->pngBody(), 200, ['Content-Type' => 'image/png']),
        ]);

        $result = (new ImageDownloader())->download('https://public.example/img.png', 1);
        $this->assertArrayHasKey('error', $result);
    }

    /* ---------------------- content validation ---------------------- */

    public function test_rejects_html_masquerading_as_image(): void
    {
        $this->fakeImage('https://evil.example/x.png', '<html><body>not an image</body></html>');
        $result = (new ImageDownloader())->download('https://evil.example/x.png', 1);
        $this->assertArrayHasKey('error', $result);
    }

    public function test_rejects_text_that_looks_like_jpeg_header_only(): void
    {
        // Correct extension/MIME header but wrong actual content.
        $this->fakeImage('https://evil.example/x.jpg', 'ABC');
        $result = (new ImageDownloader())->download('https://evil.example/x.jpg', 1);
        $this->assertArrayHasKey('error', $result);
    }

    public function test_rejects_oversized_file(): void
    {
        $huge = str_repeat('a', ImageDownloader::MAX_BYTES + 1);
        $this->fakeImage('https://big.example/huge.png', $huge);
        $result = (new ImageDownloader())->download('https://big.example/huge.png', 1);
        $this->assertArrayHasKey('error', $result);
        $this->assertStringContainsString('الحد الأقصى', $result['error']);
    }

    public function test_rejects_svg_containing_script(): void
    {
        $evilSvg = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="10" cy="10" r="5" onload="alert(2)"/></svg>';
        $this->fakeImage('https://evil.example/x.svg', $evilSvg);
        $result = (new ImageDownloader())->download('https://evil.example/x.svg', 1);
        $this->assertArrayHasKey('error', $result);
    }

    public function test_rejects_empty_http_error(): void
    {
        Http::fake([
            'https://missing.example/x.png' => Http::response('Not Found', 404),
        ]);
        $result = (new ImageDownloader())->download('https://missing.example/x.png', 1);
        $this->assertArrayHasKey('error', $result);
    }

    /* ---------------------- happy path ---------------------- */

    public function test_accepts_png_and_stores_under_store_path(): void
    {
        $this->fakeImage('https://ok.example/photo.png');
        $result = (new ImageDownloader())->download('https://ok.example/photo.png', 313);
        $this->assertArrayHasKey('path', $result);
        $this->assertSame('image/png', $result['mime']);

        // Store-scoped path under the store id.
        $this->assertStringStartsWith('products/313/', $result['path']);
        $this->assertTrue(Storage::disk('public')->exists($result['path']));
        $this->assertSame($this->pngBody(), Storage::disk('public')->get($result['path']));
    }

    public function test_accepts_jpeg(): void
    {
        $jpeg = "\xFF\xD8\xFF\xE0" . str_repeat('c', 10);
        $this->fakeImage('https://ok.example/a.jpg', $jpeg);
        $result = (new ImageDownloader())->download('https://ok.example/a.jpg', 1);
        $this->assertArrayHasKey('path', $result);
        $this->assertSame('image/jpeg', $result['mime']);
    }
}