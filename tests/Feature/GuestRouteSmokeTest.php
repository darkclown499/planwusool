<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestRouteSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_home_200(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
    }

    public function test_guest_login_200(): void
    {
        $response = $this->get('/login');
        $response->assertStatus(200);
    }

    public function test_guest_register_200(): void
    {
        $response = $this->get('/register');
        // Register may exist or redirect — accept 200 or 3xx
        $this->assertContains($response->getStatusCode(), [200, 301, 302]);
    }

    public function test_guest_robots_txt_200(): void
    {
        $response = $this->get('/robots.txt');
        $response->assertStatus(200);
    }

    public function test_guest_sitemap_xml_200(): void
    {
        $response = $this->get('/sitemap.xml');
        $response->assertStatus(200);
    }
}
