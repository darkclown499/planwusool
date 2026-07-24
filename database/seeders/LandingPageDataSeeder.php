<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Contact;
use App\Models\Newsletter;
use Carbon\Carbon;

class LandingPageDataSeeder extends Seeder
{
    public function run()
    {
        if (!config('app.is_demo', false)) {
            $this->command->info('Skipping landing page data seeder (not in demo mode).');
            return;
        }
        
        $this->seedContacts();
        $this->seedNewsletterSubscribers();
        
    }
    
    private function seedContacts()
    {
        // Check if contacts already exist
        if (Contact::where('is_landing_page', true)->exists()) {
            return;
        }

        $contacts = [
            ['name' => 'Sarah Johnson', 'email' => 'sarah.j@gmail.com', 'subject' => 'WhatsApp integration setup', 'message' => 'Hi, I would like to know how to set up WhatsApp Business API integration with my store. Can you help me with the configuration?'],
            ['name' => 'Mike Rodriguez', 'email' => 'mike.rodriguez@yahoo.com', 'subject' => 'Multi-store WhatsApp management', 'message' => 'I want to manage multiple stores with different WhatsApp numbers. Is this possible with your platform?'],
            ['name' => 'Emily Chen', 'email' => 'emily.chen@hotmail.com', 'subject' => 'WhatsApp order notifications', 'message' => 'Can customers receive order confirmations and updates directly through WhatsApp? How does the notification system work?'],
            ['name' => 'David Wilson', 'email' => 'david.wilson@outlook.com', 'subject' => 'WhatsApp catalog integration', 'message' => 'I want to sync my product catalog with WhatsApp Business. Does your platform support automatic catalog updates?'],
            ['name' => 'Lisa Garcia', 'email' => 'lisa.garcia@example.org', 'subject' => 'WhatsApp payment integration', 'message' => 'How can customers complete payments through WhatsApp? What payment gateways work with WhatsApp ordering?'],
            ['name' => 'Robert Miller', 'email' => 'robert.miller@gmail.com', 'subject' => 'WhatsApp customer support', 'message' => 'Can I handle customer support conversations directly through WhatsApp from the dashboard? How does the chat management work?'],
            ['name' => 'Jennifer Taylor', 'email' => 'jennifer.taylor@yahoo.com', 'subject' => 'WhatsApp bulk messaging', 'message' => 'Is it possible to send promotional messages to customers via WhatsApp? What are the compliance requirements?'],
            ['name' => 'Christopher Anderson', 'email' => 'chris.anderson@hotmail.com', 'subject' => 'WhatsApp API pricing', 'message' => 'What are the costs associated with WhatsApp Business API usage? Are there any additional charges for message volume?'],
            ['name' => 'Amanda Martinez', 'email' => 'amanda.martinez@example.com', 'subject' => 'WhatsApp store themes', 'message' => 'Do all store themes support WhatsApp integration? Can I customize the WhatsApp ordering button placement?'],
            ['name' => 'Daniel Rodriguez', 'email' => 'daniel.rodriguez@gmail.com', 'subject' => 'WhatsApp order management', 'message' => 'How do WhatsApp orders appear in the dashboard? Can I track order status and manage fulfillment from the admin panel?'],
            ['name' => 'Jessica Thompson', 'email' => 'jessica.thompson@outlook.com', 'subject' => 'WhatsApp multi-language support', 'message' => 'Does the WhatsApp integration support multiple languages? Can I set up automated responses in different languages?'],
            ['name' => 'Matthew White', 'email' => 'matthew.white@yahoo.com', 'subject' => 'WhatsApp analytics and reporting', 'message' => 'What kind of WhatsApp analytics are available? Can I track conversion rates from WhatsApp interactions?'],
            ['name' => 'Ashley Clark', 'email' => 'ashley.clark@example.org', 'subject' => 'WhatsApp inventory alerts', 'message' => 'Can I receive low stock alerts through WhatsApp? How do inventory notifications work with WhatsApp integration?'],
            ['name' => 'Joshua Lewis', 'email' => 'joshua.lewis@hotmail.com', 'subject' => 'WhatsApp business verification', 'message' => 'Do I need a verified WhatsApp Business account to use your platform? What is the verification process?'],
            ['name' => 'Michelle Harris', 'email' => 'michelle.harris@gmail.com', 'subject' => 'WhatsApp chatbot features', 'message' => 'Does your platform include WhatsApp chatbot functionality? Can I set up automated responses for common questions?'],
            ['name' => 'Andrew Walker', 'email' => 'andrew.walker@example.com', 'subject' => 'WhatsApp shipping updates', 'message' => 'Can customers receive shipping tracking updates via WhatsApp? How does the delivery notification system work?'],
            ['name' => 'Nicole Young', 'email' => 'nicole.young@yahoo.com', 'subject' => 'WhatsApp group marketing', 'message' => 'Is it possible to create WhatsApp groups for customer engagement and marketing? What are the best practices?'],
            ['name' => 'Ryan King', 'email' => 'ryan.king@outlook.com', 'subject' => 'WhatsApp data backup', 'message' => 'How is WhatsApp conversation data backed up and stored? What security measures are in place for customer communications?'],
            ['name' => 'Stephanie Wright', 'email' => 'stephanie.wright@hotmail.com', 'subject' => 'WhatsApp training and setup', 'message' => 'Do you provide training on how to effectively use WhatsApp for e-commerce? I need help setting up my team.'],
            ['name' => 'Kevin Lopez', 'email' => 'kevin.lopez@example.org', 'subject' => 'WhatsApp performance optimization', 'message' => 'How can I optimize my WhatsApp response times and improve customer satisfaction? Any best practices to share?'],
            ['name' => 'Rachel Hill', 'email' => 'rachel.hill@gmail.com', 'subject' => 'WhatsApp social commerce', 'message' => 'Can I integrate WhatsApp with other social media platforms? How does social commerce work with your platform?'],
            ['name' => 'Brandon Scott', 'email' => 'brandon.scott@yahoo.com', 'subject' => 'WhatsApp discount codes', 'message' => 'Can I send exclusive discount codes to customers via WhatsApp? How do promotional campaigns work through WhatsApp?'],
            ['name' => 'Samantha Green', 'email' => 'samantha.green@example.com', 'subject' => 'WhatsApp customer segmentation', 'message' => 'Is it possible to segment customers based on their WhatsApp interactions? Can I create targeted messaging campaigns?'],
            ['name' => 'Tyler Adams', 'email' => 'tyler.adams@hotmail.com', 'subject' => 'WhatsApp review collection', 'message' => 'Can I collect product reviews and feedback through WhatsApp? How does the review system integrate with WhatsApp communications?']
        ];

        foreach ($contacts as $contact) {
            $createdAt = Carbon::now()->subDays(rand(1, 60));
            
            Contact::create([
                'name' => $contact['name'],
                'email' => $contact['email'],
                'subject' => $contact['subject'],
                'message' => $contact['message'],
                'is_landing_page' => true,
                'created_at' => $createdAt,
                'updated_at' => $createdAt
            ]);
        }
    }
    
    private function seedNewsletterSubscribers()
    {
        // Check if newsletter subscribers already exist
        if (Newsletter::exists()) {
            return;
        }

        $subscribers = [
            ['email' => 'john.doe@example.com', 'status' => 'active'],
            ['email' => 'jane.smith@gmail.com', 'status' => 'active'],
            ['email' => 'mike.johnson@yahoo.com', 'status' => 'unsubscribed'],
            ['email' => 'sarah.wilson@hotmail.com', 'status' => 'active'],
            ['email' => 'david.brown@outlook.com', 'status' => 'active'],
            ['email' => 'lisa.davis@example.org', 'status' => 'active'],
            ['email' => 'robert.miller@gmail.com', 'status' => 'unsubscribed'],
            ['email' => 'emily.garcia@yahoo.com', 'status' => 'active'],
            ['email' => 'james.martinez@hotmail.com', 'status' => 'active'],
            ['email' => 'maria.rodriguez@example.com', 'status' => 'active'],
            ['email' => 'william.lopez@gmail.com', 'status' => 'active'],
            ['email' => 'jennifer.gonzalez@outlook.com', 'status' => 'unsubscribed'],
            ['email' => 'michael.anderson@yahoo.com', 'status' => 'active'],
            ['email' => 'jessica.taylor@example.org', 'status' => 'active'],
            ['email' => 'christopher.thomas@gmail.com', 'status' => 'active'],
            ['email' => 'amanda.jackson@hotmail.com', 'status' => 'active'],
            ['email' => 'daniel.white@example.com', 'status' => 'unsubscribed'],
            ['email' => 'ashley.harris@yahoo.com', 'status' => 'active'],
            ['email' => 'matthew.martin@outlook.com', 'status' => 'active'],
            ['email' => 'stephanie.thompson@gmail.com', 'status' => 'active'],
            ['email' => 'joshua.garcia@example.org', 'status' => 'active'],
            ['email' => 'michelle.clark@hotmail.com', 'status' => 'active'],
            ['email' => 'andrew.rodriguez@yahoo.com', 'status' => 'unsubscribed'],
            ['email' => 'nicole.lewis@example.com', 'status' => 'active'],
            ['email' => 'ryan.lee@gmail.com', 'status' => 'active']
        ];

        foreach ($subscribers as $subscriber) {
            $createdAt = Carbon::now()->subDays(rand(1, 90));
            
            Newsletter::create([
                'email' => $subscriber['email'],
                'status' => $subscriber['status'],
                'subscribed_at' => $subscriber['status'] === 'active' ? $createdAt : $createdAt->subDays(rand(1, 30)),
                'unsubscribed_at' => $subscriber['status'] === 'unsubscribed' ? $createdAt->addDays(rand(1, 60)) : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt
            ]);
        }
    }
}