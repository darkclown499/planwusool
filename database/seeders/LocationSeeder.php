<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Country;
use App\Models\State;
use App\Models\City;

class LocationSeeder extends Seeder
{
    public function run(): void
    {
        // Check if locations already exist
        if (Country::exists()) {
            $this->command->info('Location data already exists. Skipping seeder to preserve existing data.');
            return;
        }

        $locations = config('app.is_demo') ? $this->getDemoLocations() : $this->getMainLocations();
        
        foreach ($locations as $countryData) {
            $country = Country::firstOrCreate(
                ['code' => $countryData['code']],
                ['name' => $countryData['name'], 'status' => true]
            );

            foreach ($countryData['states'] as $stateData) {
                $state = State::firstOrCreate(
                    ['country_id' => $country->id, 'code' => $stateData['code']],
                    ['name' => $stateData['name'], 'status' => true]
                );

                foreach ($stateData['cities'] as $cityName) {
                    City::firstOrCreate(
                        ['state_id' => $state->id, 'name' => $cityName],
                        ['status' => true]
                    );
                }
            }
        }

        $version = config('app.is_demo') ? 'demo' : 'main';
        $countryCount = count($locations);
        $stateCount = array_sum(array_map(fn($c) => count($c['states']), $locations));
        $cityCount = array_sum(array_map(fn($c) => array_sum(array_map(fn($s) => count($s['cities']), $c['states'])), $locations));
        
    }

    private function getDemoLocations(): array
    {
        return [
            [
                'name' => 'United States',
                'code' => 'US',
                'states' => [
                    [
                        'name' => 'California',
                        'code' => 'CA',
                        'cities' => ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento']
                    ],
                    [
                        'name' => 'Texas',
                        'code' => 'TX',
                        'cities' => ['Houston', 'Dallas', 'Austin', 'San Antonio']
                    ]
                ]
            ],
            [
                'name' => 'India',
                'code' => 'IN',
                'states' => [
                    [
                        'name' => 'Maharashtra',
                        'code' => 'MH',
                        'cities' => ['Mumbai', 'Pune', 'Nagpur', 'Nashik']
                    ],
                    [
                        'name' => 'Gujarat',
                        'code' => 'GJ',
                        'cities' => ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot']
                    ]
                ]
            ],
            [
                'name' => 'United Kingdom',
                'code' => 'GB',
                'states' => [
                    [
                        'name' => 'England',
                        'code' => 'ENG',
                        'cities' => ['London', 'Manchester', 'Birmingham', 'Liverpool']
                    ],
                    [
                        'name' => 'Scotland',
                        'code' => 'SCT',
                        'cities' => ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee']
                    ]
                ]
            ],
            [
                'name' => 'Canada',
                'code' => 'CA',
                'states' => [
                    [
                        'name' => 'Ontario',
                        'code' => 'ON',
                        'cities' => ['Toronto', 'Ottawa', 'Hamilton', 'London']
                    ],
                    [
                        'name' => 'Quebec',
                        'code' => 'QC',
                        'cities' => ['Montreal', 'Quebec City', 'Laval', 'Gatineau']
                    ]
                ]
            ],
            [
                'name' => 'Australia',
                'code' => 'AU',
                'states' => [
                    [
                        'name' => 'New South Wales',
                        'code' => 'NSW',
                        'cities' => ['Sydney', 'Newcastle', 'Wollongong', 'Central Coast']
                    ],
                    [
                        'name' => 'Victoria',
                        'code' => 'VIC',
                        'cities' => ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo']
                    ]
                ]
            ],
            [
                'name' => 'Germany',
                'code' => 'DE',
                'states' => [
                    [
                        'name' => 'Bavaria',
                        'code' => 'BY',
                        'cities' => ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg']
                    ],
                    [
                        'name' => 'North Rhine-Westphalia',
                        'code' => 'NW',
                        'cities' => ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen']
                    ]
                ]
            ]
        ];
    }

    private function getMainLocations(): array
    {
        return [
            [
                'name' => 'United States',
                'code' => 'US',
                'states' => [
                    [
                        'name' => 'California',
                        'code' => 'CA',
                        'cities' => ['Los Angeles', 'San Francisco']
                    ],
                    [
                        'name' => 'Texas',
                        'code' => 'TX',
                        'cities' => ['Houston', 'Dallas']
                    ]
                ]
            ],
            [
                'name' => 'India',
                'code' => 'IN',
                'states' => [
                    [
                        'name' => 'Maharashtra',
                        'code' => 'MH',
                        'cities' => ['Mumbai', 'Pune']
                    ],
                    [
                        'name' => 'Gujarat',
                        'code' => 'GJ',
                        'cities' => ['Ahmedabad', 'Surat']
                    ]
                ]
            ]
        ];
    }
}