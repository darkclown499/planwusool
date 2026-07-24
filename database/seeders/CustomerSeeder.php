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
                'first_name' => 'John',
                'last_name' => 'Smith',
                'email' => 'john.smith@example.com',
                'phone' => '+1-555-0101',
                'date_of_birth' => '1985-03-15',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '123 Main Street',
                    'city' => 'New York',
                    'state' => 'NY',
                    'postal_code' => '10001',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '123 Main Street',
                    'city' => 'New York',
                    'state' => 'NY',
                    'postal_code' => '10001',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Sarah',
                'last_name' => 'Johnson',
                'email' => 'sarah.johnson@example.com',
                'phone' => '+1-555-0102',
                'date_of_birth' => '1990-07-22',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '456 Oak Avenue',
                    'city' => 'Los Angeles',
                    'state' => 'CA',
                    'postal_code' => '90210',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '789 Pine Road',
                    'city' => 'Beverly Hills',
                    'state' => 'CA',
                    'postal_code' => '90212',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Michael',
                'last_name' => 'Brown',
                'email' => 'michael.brown@example.com',
                'phone' => '+1-555-0103',
                'date_of_birth' => '1988-11-08',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '789 Elm Street',
                    'city' => 'Chicago',
                    'state' => 'IL',
                    'postal_code' => '60601',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '789 Elm Street',
                    'city' => 'Chicago',
                    'state' => 'IL',
                    'postal_code' => '60601',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Emily',
                'last_name' => 'Davis',
                'email' => 'emily.davis@example.com',
                'phone' => '+1-555-0104',
                'date_of_birth' => '1992-05-14',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '321 Maple Drive',
                    'city' => 'Houston',
                    'state' => 'TX',
                    'postal_code' => '77001',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '654 Cedar Lane',
                    'city' => 'Dallas',
                    'state' => 'TX',
                    'postal_code' => '75201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'David',
                'last_name' => 'Wilson',
                'email' => 'david.wilson@example.com',
                'phone' => '+1-555-0105',
                'date_of_birth' => '1987-09-30',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '987 Birch Boulevard',
                    'city' => 'Phoenix',
                    'state' => 'AZ',
                    'postal_code' => '85001',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '987 Birch Boulevard',
                    'city' => 'Phoenix',
                    'state' => 'AZ',
                    'postal_code' => '85001',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Lisa',
                'last_name' => 'Anderson',
                'email' => 'lisa.anderson@example.com',
                'phone' => '+1-555-0106',
                'date_of_birth' => '1991-12-03',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '147 Willow Way',
                    'city' => 'Philadelphia',
                    'state' => 'PA',
                    'postal_code' => '19101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '147 Willow Way',
                    'city' => 'Philadelphia',
                    'state' => 'PA',
                    'postal_code' => '19101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'James',
                'last_name' => 'Taylor',
                'email' => 'james.taylor@example.com',
                'phone' => '+1-555-0107',
                'date_of_birth' => '1986-04-18',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '258 Spruce Street',
                    'city' => 'San Antonio',
                    'state' => 'TX',
                    'postal_code' => '78201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '258 Spruce Street',
                    'city' => 'San Antonio',
                    'state' => 'TX',
                    'postal_code' => '78201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Jessica',
                'last_name' => 'Martinez',
                'email' => 'jessica.martinez@example.com',
                'phone' => '+1-555-0108',
                'date_of_birth' => '1993-08-25',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '369 Poplar Place',
                    'city' => 'San Diego',
                    'state' => 'CA',
                    'postal_code' => '92101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '741 Redwood Road',
                    'city' => 'San Francisco',
                    'state' => 'CA',
                    'postal_code' => '94102',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Robert',
                'last_name' => 'Garcia',
                'email' => 'robert.garcia@example.com',
                'phone' => '+1-555-0109',
                'date_of_birth' => '1984-06-12',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '852 Hickory Hill',
                    'city' => 'Denver',
                    'state' => 'CO',
                    'postal_code' => '80201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '852 Hickory Hill',
                    'city' => 'Denver',
                    'state' => 'CO',
                    'postal_code' => '80201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Amanda',
                'last_name' => 'Rodriguez',
                'email' => 'amanda.rodriguez@example.com',
                'phone' => '+1-555-0110',
                'date_of_birth' => '1989-10-07',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '963 Chestnut Circle',
                    'city' => 'Seattle',
                    'state' => 'WA',
                    'postal_code' => '98101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '159 Walnut Way',
                    'city' => 'Portland',
                    'state' => 'OR',
                    'postal_code' => '97201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Christopher',
                'last_name' => 'Lee',
                'email' => 'christopher.lee@example.com',
                'phone' => '+1-555-0111',
                'date_of_birth' => '1991-01-28',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '753 Magnolia Manor',
                    'city' => 'Boston',
                    'state' => 'MA',
                    'postal_code' => '02101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '753 Magnolia Manor',
                    'city' => 'Boston',
                    'state' => 'MA',
                    'postal_code' => '02101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Michelle',
                'last_name' => 'White',
                'email' => 'michelle.white@example.com',
                'phone' => '+1-555-0112',
                'date_of_birth' => '1994-04-16',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '486 Dogwood Drive',
                    'city' => 'Atlanta',
                    'state' => 'GA',
                    'postal_code' => '30301',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '486 Dogwood Drive',
                    'city' => 'Atlanta',
                    'state' => 'GA',
                    'postal_code' => '30301',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Daniel',
                'last_name' => 'Harris',
                'email' => 'daniel.harris@example.com',
                'phone' => '+1-555-0113',
                'date_of_birth' => '1983-12-09',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '357 Sycamore Street',
                    'city' => 'Miami',
                    'state' => 'FL',
                    'postal_code' => '33101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '357 Sycamore Street',
                    'city' => 'Miami',
                    'state' => 'FL',
                    'postal_code' => '33101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Ashley',
                'last_name' => 'Clark',
                'email' => 'ashley.clark@example.com',
                'phone' => '+1-555-0114',
                'date_of_birth' => '1992-08-21',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '159 Beech Boulevard',
                    'city' => 'Las Vegas',
                    'state' => 'NV',
                    'postal_code' => '89101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '951 Ash Avenue',
                    'city' => 'Reno',
                    'state' => 'NV',
                    'postal_code' => '89501',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Matthew',
                'last_name' => 'Lewis',
                'email' => 'matthew.lewis@example.com',
                'phone' => '+1-555-0115',
                'date_of_birth' => '1986-05-03',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '753 Cypress Court',
                    'city' => 'Nashville',
                    'state' => 'TN',
                    'postal_code' => '37201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '753 Cypress Court',
                    'city' => 'Nashville',
                    'state' => 'TN',
                    'postal_code' => '37201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Stephanie',
                'last_name' => 'Walker',
                'email' => 'stephanie.walker@example.com',
                'phone' => '+1-555-0116',
                'date_of_birth' => '1990-11-14',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '246 Fir Forest',
                    'city' => 'Charlotte',
                    'state' => 'NC',
                    'postal_code' => '28201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '246 Fir Forest',
                    'city' => 'Charlotte',
                    'state' => 'NC',
                    'postal_code' => '28201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Andrew',
                'last_name' => 'Hall',
                'email' => 'andrew.hall@example.com',
                'phone' => '+1-555-0117',
                'date_of_birth' => '1988-02-26',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '864 Juniper Junction',
                    'city' => 'Detroit',
                    'state' => 'MI',
                    'postal_code' => '48201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '864 Juniper Junction',
                    'city' => 'Detroit',
                    'state' => 'MI',
                    'postal_code' => '48201',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Nicole',
                'last_name' => 'Allen',
                'email' => 'nicole.allen@example.com',
                'phone' => '+1-555-0118',
                'date_of_birth' => '1993-07-19',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '135 Laurel Lane',
                    'city' => 'Portland',
                    'state' => 'ME',
                    'postal_code' => '04101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '135 Laurel Lane',
                    'city' => 'Portland',
                    'state' => 'ME',
                    'postal_code' => '04101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Joshua',
                'last_name' => 'Young',
                'email' => 'joshua.young@example.com',
                'phone' => '+1-555-0119',
                'date_of_birth' => '1985-09-11',
                'gender' => 'male',
                'billing_address' => [
                    'address' => '579 Hazel Heights',
                    'city' => 'Salt Lake City',
                    'state' => 'UT',
                    'postal_code' => '84101',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '579 Hazel Heights',
                    'city' => 'Salt Lake City',
                    'state' => 'UT',
                    'postal_code' => '84101',
                    'country' => 'us'
                ]
            ],
            [
                'first_name' => 'Samantha',
                'last_name' => 'King',
                'email' => 'samantha.king@example.com',
                'phone' => '+1-555-0120',
                'date_of_birth' => '1991-03-05',
                'gender' => 'female',
                'billing_address' => [
                    'address' => '468 Peach Plaza',
                    'city' => 'Richmond',
                    'state' => 'VA',
                    'postal_code' => '23201',
                    'country' => 'us'
                ],
                'shipping_address' => [
                    'address' => '468 Peach Plaza',
                    'city' => 'Richmond',
                    'state' => 'VA',
                    'postal_code' => '23201',
                    'country' => 'us'
                ]
            ],
        ];
    }
}