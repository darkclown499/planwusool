<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        // Check if customer data already exists
        if (Customer::exists()) {
            $this->command->info('Customer data already exists. Skipping seeder to preserve existing data.');
            return;
        }
        
        $stores = Store::all();
        $totalCustomers = 0;

        foreach ($stores as $store) {
            $customerCount = rand(8, 12); // Random 8-12 customers per store
            $customers = $this->getCustomersData();
            
            for ($i = 0; $i < $customerCount; $i++) {
                $customerData = $customers[$i % count($customers)];
                $daysAgo = ($store->id * 10) + $i + rand(1, 60);
                $createdAt = Carbon::now()->subDays($daysAgo);
                
                // Generate unique email for each store
                $emailParts = explode('@', $customerData['email']);
                $uniqueEmail = $store->id === 1 ? $customerData['email'] : $emailParts[0] . '.s' . $store->id . '@' . $emailParts[1];
                
                $customer = Customer::firstOrCreate(
                    ['email' => $uniqueEmail, 'store_id' => $store->id],
                    [
                        'store_id' => $store->id,
                        'first_name' => $customerData['first_name'],
                        'last_name' => $customerData['last_name'],
                        'email' => $uniqueEmail,
                        'password' => Hash::make('password'),
                        'phone' => $customerData['phone'],
                        'date_of_birth' => $customerData['date_of_birth'],
                        'gender' => $customerData['gender'],
                        'is_active' => true,
                        'email_marketing' => rand(0, 1),
                        'sms_notifications' => rand(0, 1),
                        'order_updates' => true,
                        'total_orders' => rand(0, 15),
                        'total_spent' => rand(50, 2000),
                        'created_at' => $createdAt,
                        'updated_at' => $createdAt,
                    ]
                );
                
                // Create billing address
                \App\Models\CustomerAddress::firstOrCreate(
                    ['customer_id' => $customer->id, 'type' => 'billing', 'is_default' => true],
                    [
                        'address' => $customerData['billing_address']['address'],
                        'city' => $customerData['billing_address']['city'],
                        'state' => $customerData['billing_address']['state'],
                        'postal_code' => $customerData['billing_address']['postal_code'],
                        'country' => $customerData['billing_address']['country'],
                    ]
                );
                
                // Create shipping address
                \App\Models\CustomerAddress::firstOrCreate(
                    ['customer_id' => $customer->id, 'type' => 'shipping', 'is_default' => true],
                    [
                        'address' => $customerData['shipping_address']['address'],
                        'city' => $customerData['shipping_address']['city'],
                        'state' => $customerData['shipping_address']['state'],
                        'postal_code' => $customerData['shipping_address']['postal_code'],
                        'country' => $customerData['shipping_address']['country'],
                    ]
                );
                $totalCustomers++;
            }
        }

    }

    private function getCustomersData(): array
    {
        return [
            [
                'first_name' => 'محمد',
                'last_name' => 'الخطيب',
                'email' => 'john.smith@example.com',
                'phone' => '+1-555-0101',
                'date_of_birth' => '1985-03-15',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'شارع الرشيد',
                    'city' => 'نيويورك',
                    'state' => 'NY',
                    'postal_code' => '10001',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع الرشيد',
                    'city' => 'نيويورك',
                    'state' => 'NY',
                    'postal_code' => '10001',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'سارة',
                'last_name' => 'حداد',
                'email' => 'sarah.johnson@example.com',
                'phone' => '+1-555-0102',
                'date_of_birth' => '1990-07-22',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'شارع الملك فهد',
                    'city' => 'لوس أنجلوس',
                    'state' => 'CA',
                    'postal_code' => '90210',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع المدينة المنورة',
                    'city' => 'بيفرلي هيلز',
                    'state' => 'CA',
                    'postal_code' => '90212',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'خالد',
                'last_name' => 'الحاج',
                'email' => 'michael.brown@example.com',
                'phone' => '+1-555-0103',
                'date_of_birth' => '1988-11-08',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'شارع السلام',
                    'city' => 'شيكاغو',
                    'state' => 'IL',
                    'postal_code' => '60601',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع السلام',
                    'city' => 'شيكاغو',
                    'state' => 'IL',
                    'postal_code' => '60601',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'فاطمة',
                'last_name' => 'مصطفى',
                'email' => 'emily.davis@example.com',
                'phone' => '+1-555-0104',
                'date_of_birth' => '1992-05-14',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'حي الروضة',
                    'city' => 'هيوستن',
                    'state' => 'TX',
                    'postal_code' => '77001',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع التحرير',
                    'city' => 'دالاس',
                    'state' => 'TX',
                    'postal_code' => '75201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'يوسف',
                'last_name' => 'القاسم',
                'email' => 'david.wilson@example.com',
                'phone' => '+1-555-0105',
                'date_of_birth' => '1987-09-30',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'شارع العليا',
                    'city' => 'فينيكس',
                    'state' => 'AZ',
                    'postal_code' => '85001',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع العليا',
                    'city' => 'فينيكس',
                    'state' => 'AZ',
                    'postal_code' => '85001',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'نور',
                'last_name' => 'عبد الله',
                'email' => 'lisa.anderson@example.com',
                'phone' => '+1-555-0106',
                'date_of_birth' => '1991-12-03',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'شارع الجامعة',
                    'city' => 'فيلادلفيا',
                    'state' => 'PA',
                    'postal_code' => '19101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع الجامعة',
                    'city' => 'فيلادلفيا',
                    'state' => 'PA',
                    'postal_code' => '19101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'أحمد',
                'last_name' => 'الحسن',
                'email' => 'james.taylor@example.com',
                'phone' => '+1-555-0107',
                'date_of_birth' => '1986-04-18',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'حي الياسمين',
                    'city' => 'سان أنطونيو',
                    'state' => 'TX',
                    'postal_code' => '78201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'حي الياسمين',
                    'city' => 'سان أنطونيو',
                    'state' => 'TX',
                    'postal_code' => '78201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'ليلى',
                'last_name' => 'إبراهيم',
                'email' => 'jessica.martinez@example.com',
                'phone' => '+1-555-0108',
                'date_of_birth' => '1993-08-25',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'شارع الخليج',
                    'city' => 'سان دييغو',
                    'state' => 'CA',
                    'postal_code' => '92101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع النيل',
                    'city' => 'سان فرانسيسكو',
                    'state' => 'CA',
                    'postal_code' => '94102',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'عمر',
                'last_name' => 'السالم',
                'email' => 'robert.garcia@example.com',
                'phone' => '+1-555-0109',
                'date_of_birth' => '1984-06-12',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'حي المروج',
                    'city' => 'دنفر',
                    'state' => 'CO',
                    'postal_code' => '80201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'حي المروج',
                    'city' => 'دنفر',
                    'state' => 'CO',
                    'postal_code' => '80201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'مريم',
                'last_name' => 'خالد',
                'email' => 'amanda.rodriguez@example.com',
                'phone' => '+1-555-0110',
                'date_of_birth' => '1989-10-07',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'شارع الصحافة',
                    'city' => 'سياتل',
                    'state' => 'WA',
                    'postal_code' => '98101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'حي النسيم',
                    'city' => 'بورتلاند',
                    'state' => 'OR',
                    'postal_code' => '97201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'علي',
                'last_name' => 'الشمري',
                'email' => 'christopher.lee@example.com',
                'phone' => '+1-555-0111',
                'date_of_birth' => '1991-01-28',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'شارع السوق',
                    'city' => 'بوسطن',
                    'state' => 'MA',
                    'postal_code' => '02101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع السوق',
                    'city' => 'بوسطن',
                    'state' => 'MA',
                    'postal_code' => '02101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'هدى',
                'last_name' => 'منصور',
                'email' => 'michelle.white@example.com',
                'phone' => '+1-555-0112',
                'date_of_birth' => '1994-04-16',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'حي الواحة',
                    'city' => 'أتلانتا',
                    'state' => 'GA',
                    'postal_code' => '30301',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'حي الواحة',
                    'city' => 'أتلانتا',
                    'state' => 'GA',
                    'postal_code' => '30301',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'محمود',
                'last_name' => 'عبد الرحمن',
                'email' => 'daniel.harris@example.com',
                'phone' => '+1-555-0113',
                'date_of_birth' => '1983-12-09',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'شارع النخيل',
                    'city' => 'ميامي',
                    'state' => 'FL',
                    'postal_code' => '33101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع النخيل',
                    'city' => 'ميامي',
                    'state' => 'FL',
                    'postal_code' => '33101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'ريم',
                'last_name' => 'العلي',
                'email' => 'ashley.clark@example.com',
                'phone' => '+1-555-0114',
                'date_of_birth' => '1992-08-21',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'شارع الملك عبد العزيز',
                    'city' => 'لاس فيغاس',
                    'state' => 'NV',
                    'postal_code' => '89101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'حي العليا',
                    'city' => 'رينو',
                    'state' => 'NV',
                    'postal_code' => '89501',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'حسن',
                'last_name' => 'الدوسري',
                'email' => 'matthew.lewis@example.com',
                'phone' => '+1-555-0115',
                'date_of_birth' => '1986-05-03',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'شارع الجمهورية',
                    'city' => 'ناشفيل',
                    'state' => 'TN',
                    'postal_code' => '37201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع الجمهورية',
                    'city' => 'ناشفيل',
                    'state' => 'TN',
                    'postal_code' => '37201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'آية',
                'last_name' => 'الزهراني',
                'email' => 'stephanie.walker@example.com',
                'phone' => '+1-555-0116',
                'date_of_birth' => '1990-11-14',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'حي الفيحاء',
                    'city' => 'شارلوت',
                    'state' => 'NC',
                    'postal_code' => '28201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'حي الفيحاء',
                    'city' => 'شارلوت',
                    'state' => 'NC',
                    'postal_code' => '28201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'زياد',
                'last_name' => 'العتيبي',
                'email' => 'andrew.hall@example.com',
                'phone' => '+1-555-0117',
                'date_of_birth' => '1988-02-26',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'شارع الثورة',
                    'city' => 'ديترويت',
                    'state' => 'MI',
                    'postal_code' => '48201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع الثورة',
                    'city' => 'ديترويت',
                    'state' => 'MI',
                    'postal_code' => '48201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'دينا',
                'last_name' => 'حسن',
                'email' => 'nicole.allen@example.com',
                'phone' => '+1-555-0118',
                'date_of_birth' => '1993-07-19',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'حي الأندلس',
                    'city' => 'بورتلاند',
                    'state' => 'ME',
                    'postal_code' => '04101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'حي الأندلس',
                    'city' => 'بورتلاند',
                    'state' => 'ME',
                    'postal_code' => '04101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'فهد',
                'last_name' => 'العنزي',
                'email' => 'joshua.young@example.com',
                'phone' => '+1-555-0119',
                'date_of_birth' => '1985-09-11',
                'gender' => 'male',
                'billing_address' => [
                    'address' => 'شارع المطار',
                    'city' => 'سولت ليك سيتي',
                    'state' => 'UT',
                    'postal_code' => '84101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع المطار',
                    'city' => 'سولت ليك سيتي',
                    'state' => 'UT',
                    'postal_code' => '84101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'سلمى',
                'last_name' => 'فاروق',
                'email' => 'samantha.king@example.com',
                'phone' => '+1-555-0120',
                'date_of_birth' => '1991-03-05',
                'gender' => 'female',
                'billing_address' => [
                    'address' => 'شارع البحر',
                    'city' => 'ريتشموند',
                    'state' => 'VA',
                    'postal_code' => '23201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => 'شارع البحر',
                    'city' => 'ريتشموند',
                    'state' => 'VA',
                    'postal_code' => '23201',
                    'country' => 'us'
                ]
            ],
        ];
    }
}