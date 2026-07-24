<?php

namespace Database\Seeders;

use App\Models\LandingPageCustomPage;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class CustomPageSeeder extends Seeder
{
    public function run(): void
    {
        if (config('app.is_demo')) {
            $this->createDemoPages();
        } else {
            $this->createMainVersionPages();
        }
    }

    private function createDemoPages()
    {
        $pages = $this->getCustomPages();
        
        foreach ($pages as $index => $pageData) {
            // Skip if page already exists
            if (LandingPageCustomPage::where('slug', $pageData['slug'])->exists()) {
                continue;
            }
            
            $daysAgo = $index + rand(5, 25);
            $createdAt = Carbon::now()->subDays($daysAgo);
            
            LandingPageCustomPage::create([
                'title' => $pageData['title'],
                'slug' => $pageData['slug'],
                'content' => $pageData['content'],
                'meta_title' => $pageData['title'],
                'meta_description' => $pageData['meta_description'],
                'is_active' => true,
                'sort_order' => $pageData['order'],
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }
    }

    private function createMainVersionPages()
    {
        // Create only 3 essential pages for main version
        $allPages = $this->getCustomPages();
        $essentialPages = array_filter($allPages, function($page) {
            return in_array($page['title'], ['About Us', 'Contact Us', 'FAQ']);
        });
        
        foreach ($essentialPages as $index => $pageData) {
            // Skip if page already exists
            if (LandingPageCustomPage::where('slug', $pageData['slug'])->exists()) {
                continue;
            }
            
            LandingPageCustomPage::create([
                'title' => $pageData['title'],
                'slug' => $pageData['slug'],
                'content' => $pageData['content'],
                'meta_title' => $pageData['title'],
                'meta_description' => $pageData['meta_description'],
                'is_active' => true,
                'sort_order' => $pageData['order'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('Created ' . count($essentialPages) . ' custom pages for main version.');
    }

    private function getCustomPages(): array
    {
        return [
            [
                'title' => 'About Us',
                'slug' => 'about-us',
                'content' => "About Our WhatsApp E-commerce Platform: Empowering entrepreneurs to <b>create, manage, and scale multiple WhatsApp-integrated online stores</b>.<br>We are dedicated to helping businesses streamline e-commerce operations with direct WhatsApp ordering, optimize store management, and grow their revenue with ease.<br>Our platform centralizes store data, automates WhatsApp communications, and provides actionable insights to drive business growth.<br>Whether you're launching your first WhatsApp store or managing multiple brands, our platform adapts to your needs—from product management to WhatsApp customer support—ensuring efficiency, scalability, and measurable success.<br><b>Stats:</b> • 4+ Years WhatsApp E-commerce Experience • 15K+ Active Stores • 100+ Countries Served<br><b>Our Mission:</b> Transform the way businesses operate online by providing scalable, intelligent, and user-friendly WhatsApp-integrated multi-store e-commerce solutions.<br><b>Our Values:</b> Innovation, reliability, and merchant success are at the heart of everything we build.<br><b>Our Commitment:</b> Deliver secure, scalable, and reliable WhatsApp e-commerce solutions with world-class support.<br><b>Our Vision:</b> A future where every entrepreneur maximizes their potential through automated WhatsApp store management, data-driven decisions, and seamless customer experiences.",
                'order' => 1,
                'meta_description' => 'Learn more about Wusool – designed to simplify WhatsApp e-commerce operations, optimize inventory management, and accelerate business growth for entrepreneurs worldwide.',
            ],
            [
                'title' => 'Contact Us',
                'slug' => 'contact-us',
                'content' => "Have questions about <b>Wusool</b>? Our team is here to assist you with demos, WhatsApp integration, pricing, and more.<br><br><b>Send us a Message:</b> Fill out the form with your Full Name, Email Address, Subject, and Message. Our dedicated support team will get back to you promptly.<br><br><b>Contact Information:</b><br>• <b>Email Us:</b> support@Wusool.com (Average response time: within 24 hours)<br>• <b>Call Us:</b> +1 (555) 123-4567 (Available Monday – Friday, 9am – 6pm EST)<br>• <b>Visit Us:</b> 123 E-commerce Street, Suite 100, San Francisco, CA 94105<br><br><b>Business Hours:</b><br>• Monday - Friday: 9:00 AM - 6:00 PM EST<br>• Saturday: 10:00 AM - 2:00 PM EST<br>• Sunday: Closed",
                'order' => 2,
                'meta_description' => 'Reach out to our Wusool support team for inquiries, demos, WhatsApp integration help, or technical assistance. We\'re here to help you succeed.',
            ],
            [
                'title' => 'Privacy Policy',
                'slug' => 'privacy-policy',
                'content' => '<div class="privacy-policy">
                    <h1>Privacy Policy</h1>
                    <p class="last-updated"><em>Last updated: January 2026</em></p>
                    
                    <h2>Information We Collect</h2>
                    <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support.</p>
                    
                    <h3>Personal Information</h3>
                    <ul>
                        <li>Name and contact information</li>
                        <li>Billing and shipping addresses</li>
                        <li>Payment information</li>
                        <li>Order history and preferences</li>
                    </ul>
                    
                    <h2>How We Use Your Information</h2>
                    <p>We use the information we collect to:</p>
                    <ul>
                        <li>Process and fulfill your orders</li>
                        <li>Provide customer support</li>
                        <li>Send you updates about your orders</li>
                        <li>Improve our products and services</li>
                        <li>Comply with legal obligations</li>
                    </ul>
                    
                    <h2>Information Sharing</h2>
                    <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.</p>
                    
                    <h2>Data Security</h2>
                    <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
                    
                    <h2>Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us at privacy@Wusool.com</p>
                </div>',
                'order' => 3,
                'meta_description' => 'Our comprehensive privacy policy explaining how we collect, use, and protect your personal information.',
            ],
            [
                'title' => 'Terms of Service',
                'slug' => 'terms-of-service',
                'content' => '<div class="terms-of-service">
                    <h1>Terms of Service</h1>
                    <p class="last-updated"><em>Last updated: January 2026</em></p>
                    
                    <h2>Acceptance of Terms</h2>
                    <p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>
                    
                    <h2>Use License</h2>
                    <p>Permission is granted to temporarily download one copy of the materials on our website for personal, non-commercial transitory viewing only.</p>
                    
                    <h2>Disclaimer</h2>
                    <p>The materials on our website are provided on an "as is" basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
                    
                    <h2>Limitations</h2>
                    <p>In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website.</p>
                    
                    <h2>Accuracy of Materials</h2>
                    <p>The materials appearing on our website could include technical, typographical, or photographic errors. We do not warrant that any of the materials on its website are accurate, complete, or current.</p>
                    
                    <h2>Links</h2>
                    <p>We have not reviewed all of the sites linked to our website and are not responsible for the contents of any such linked site.</p>
                    
                    <h2>Modifications</h2>
                    <p>We may revise these terms of service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.</p>
                </div>',
                'order' => 4,
                'meta_description' => 'Terms and conditions governing the use of our website and services.',
            ],
            [
                'title' => 'FAQ',
                'slug' => 'faq',
                'content' => '<div class="faq-page">
                    <h1>Frequently Asked Questions</h1>
                    <p class="intro">Find answers to the most common questions about our WhatsApp e-commerce platform.</p>
                    
                    <div class="faq-section">
                        <h2>Getting Started</h2>
                        
                        <div class="faq-item">
                            <h3>How do I create my first store?</h3>
                            <p>After signing up, navigate to the Stores section and click "Create New Store". Follow the setup wizard to configure your store settings, add products, and customize your WhatsApp integration.</p>
                        </div>
                        
                        <div class="faq-item">
                            <h3>Can I manage multiple stores?</h3>
                            <p>Yes! Our platform supports multiple stores under one account. You can easily switch between stores and manage them independently with separate WhatsApp numbers and product catalogs.</p>
                        </div>
                        
                        <div class="faq-item">
                            <h3>How does WhatsApp integration work?</h3>
                            <p>Connect your WhatsApp Business number to receive orders directly. Customers can browse your catalog and place orders through WhatsApp, making the shopping experience seamless and familiar.</p>
                        </div>
                    </div>
                    
                    <div class="faq-section">
                        <h2>Plans & Pricing</h2>
                        
                        <div class="faq-item">
                            <h3>What plans are available?</h3>
                            <p>We offer flexible plans from Starter to Enterprise, each with different store limits, features, and support levels. Check our pricing page for detailed comparisons.</p>
                        </div>
                        
                        <div class="faq-item">
                            <h3>Can I upgrade or downgrade my plan?</h3>
                            <p>Yes, you can change your plan anytime from your account settings. Upgrades take effect immediately, while downgrades apply at your next billing cycle.</p>
                        </div>
                    </div>
                    
                    <div class="faq-section">
                        <h2>Technical Support</h2>
                        
                        <div class="faq-item">
                            <h3>How do I get support?</h3>
                            <p>Contact our support team through the help center, email, or live chat. We provide 24/7 support for Enterprise customers and business hours support for other plans.</p>
                        </div>
                        
                        <div class="faq-item">
                            <h3>Is there a mobile app?</h3>
                            <p>Yes, our mobile app is available for iOS and Android, allowing you to manage your stores, view analytics, and respond to customer messages on the go.</p>
                        </div>
                    </div>
                </div>',
                'order' => 5,
                'meta_description' => 'Frequently asked questions about Wusool platform, features, pricing, and support.',
            ],
            [
                'title' => 'Features',
                'slug' => 'features',
                'content' => '<div class="features-page">
                    <h1>Platform Features</h1>
                    <p class="intro">Discover the powerful features that make Wusool the leading WhatsApp e-commerce platform.</p>
                    
                    <div class="feature-section">
                        <h2>Multi-Store Management</h2>
                        <ul>
                            <li>Create and manage unlimited stores (plan dependent)</li>
                            <li>Independent WhatsApp integration for each store</li>
                            <li>Separate product catalogs and customer bases</li>
                            <li>Centralized dashboard for all stores</li>
                        </ul>
                    </div>
                    
                    <div class="feature-section">
                        <h2>WhatsApp Integration</h2>
                        <ul>
                            <li>Direct WhatsApp Business API integration</li>
                            <li>Automated order notifications</li>
                            <li>Customer support through WhatsApp</li>
                            <li>Broadcast messaging for promotions</li>
                        </ul>
                    </div>
                    
                    <div class="feature-section">
                        <h2>Product Management</h2>
                        <ul>
                            <li>Easy product catalog creation</li>
                            <li>Inventory tracking and alerts</li>
                            <li>Multiple product variants and options</li>
                            <li>Bulk import/export capabilities</li>
                        </ul>
                    </div>
                    
                    <div class="feature-section">
                        <h2>Analytics & Reporting</h2>
                        <ul>
                            <li>Real-time sales analytics</li>
                            <li>Customer behavior insights</li>
                            <li>Revenue tracking and forecasting</li>
                            <li>Export reports in multiple formats</li>
                        </ul>
                    </div>
                </div>',
                'order' => 6,
                'meta_description' => 'Explore Wusool platform features including multi-store management, WhatsApp integration, and analytics.',
            ]
        ];
    }
}