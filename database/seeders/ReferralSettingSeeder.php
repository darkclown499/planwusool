<?php

namespace Database\Seeders;

use App\Models\ReferralSetting;
use App\Models\Referral;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class ReferralSettingSeeder extends Seeder
{
    public function run(): void
    {
        // Create referral settings if they don't exist
        if (!ReferralSetting::exists()) {
            $settings = config('app.is_demo') ? $this->getDemoSettings() : $this->getMainSettings();

            ReferralSetting::firstOrCreate(
                ['id' => 1],
                $settings
            );
        }

        // Create referral data and payout requests only in demo mode
        if (config('app.is_demo')) {
            $this->createReferralData();
            $this->createPayoutRequests();
        }
    }

    private function createReferralData(): void
    {
        if (Referral::exists()) {
            return;
        }

        $companies = User::where('type', 'company')->get();
        $plans = Plan::all();
        
        if ($companies->isEmpty() || $plans->isEmpty()) {
            $this->command->warn('No companies or plans found. Skipping referral data creation.');
            return;
        }

        // Skip referral data creation if only one company exists (main mode)
        if ($companies->count() < 2) {
            $this->command->info('Only one company found. Skipping referral data creation.');
            return;
        }

        $totalReferrals = 0;
        
        // Create referrals where company@example.com is the referrer (earns commission)
        $mainCompany = $companies->where('email', 'company@example.com')->first();
        if ($mainCompany) {
            $referralCount = config('app.is_demo') ? rand(8, 12) : rand(4, 6);
            
            for ($i = 0; $i < $referralCount; $i++) {
                $daysAgo = rand(1, 120) + $i;
                $createdAt = Carbon::now()->subDays($daysAgo);
                
                // Main company refers other companies
                $otherCompanies = $companies->where('id', '!=', $mainCompany->id);
                if ($otherCompanies->isEmpty()) {
                    break;
                }
                
                $referredCompany = $otherCompanies->random();
                
                // Update the referred user to show they used main company's referral code
                $referredCompany->update([
                    'used_referral_code' => $mainCompany->referral_code ?? $mainCompany->id
                ]);
                
                Referral::create([
                    'user_id' => $referredCompany->id, // Who was referred
                    'company_id' => $mainCompany->id,   // Who gets the commission
                    'commission_percentage' => config('app.is_demo') ? 15.00 : 10.00,
                    'amount' => $this->getRandomAmount(),
                    'plan_id' => $plans->random()->id,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
                $totalReferrals++;
            }
        }
        
        // Create some referrals for other companies too
        foreach ($companies->where('email', '!=', 'company@example.com') as $companyIndex => $company) {
            $referralCount = config('app.is_demo') ? rand(2, 4) : rand(1, 2);
            
            for ($i = 0; $i < $referralCount; $i++) {
                $daysAgo = rand(1, 120) + ($companyIndex * 3) + $i;
                $createdAt = Carbon::now()->subDays($daysAgo);
                
                // Use existing companies as referred users instead of creating new ones
                $otherCompanies = $companies->where('id', '!=', $company->id);
                if ($otherCompanies->isEmpty()) {
                    break;
                }
                
                $referredCompany = $otherCompanies->random();
                
                // Update the referred user to show they used this referrer's code
                $referredCompany->update([
                    'used_referral_code' => $company->referral_code ?? $company->id
                ]);
                
                Referral::create([
                    'user_id' => $referredCompany->id, // Who was referred
                    'company_id' => $company->id,       // Who gets the commission
                    'commission_percentage' => config('app.is_demo') ? 15.00 : 10.00,
                    'amount' => $this->getRandomAmount(),
                    'plan_id' => $plans->random()->id,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
                $totalReferrals++;
            }
        }

        if ($totalReferrals > 0) {
            $this->command->info("Created {$totalReferrals} referral records.");
        }
    }

    private function createPayoutRequests(): void
    {
        if (PayoutRequest::exists()) {
            return;
        }

        $companies = User::where('type', 'company')->get();
        $totalRequests = 0;

        foreach ($companies as $companyIndex => $company) {
            $requestCount = $company->email === 'company@example.com' ? 
                (config('app.is_demo') ? rand(4, 6) : rand(2, 3)) :
                (config('app.is_demo') ? rand(2, 4) : rand(1, 2));
            
            for ($i = 0; $i < $requestCount; $i++) {
                $daysAgo = rand(5, 60) + ($companyIndex * 2) + $i;
                $createdAt = Carbon::now()->subDays($daysAgo);
                $status = $i < 2 ? ['pending', 'approved'][array_rand(['pending', 'approved'])] : 
                    ['approved', 'rejected'][array_rand(['approved', 'rejected'])];
                
                PayoutRequest::create([
                    'company_id' => $company->id,
                    'amount' => config('app.is_demo') ? rand(2550, 23450) / 100 : rand(5200, 31250) / 100,
                    'status' => $status,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
                $totalRequests++;
            }
        }

        if ($totalRequests > 0) {
            $this->command->info("Created {$totalRequests} payout requests.");
        }
    }

    private function getReferralCount(string $email, int $index): int
    {
        if ($email === 'company@example.com') {
            return config('app.is_demo') ? rand(8, 12) : rand(4, 6);
        }
        
        return config('app.is_demo') ? rand(3, 6) : rand(1, 3);
    }

    private function getRandomAmount(): float
    {
        $amounts = config('app.is_demo') ? 
            [15.00, 25.00, 35.00, 45.00, 55.00, 65.00, 75.00, 85.00, 95.00] :
            [10.00, 20.00, 30.00, 40.00, 50.00, 60.00, 70.00, 80.00];
            
        return $amounts[array_rand($amounts)];
    }

    private function getDemoSettings(): array
    {
        return [
            'is_enabled' => true,
            'commission_percentage' => 15.00,
            'threshold_amount' => 25.00,
            'guidelines' => 'Welcome to our referral program! Earn 15% commission when users sign up using your referral link and purchase any plan. 

Key Benefits:
• Earn 15% commission on all successful referrals
• Low $25 minimum payout threshold
• Fast payouts within 7 business days
• Real-time tracking dashboard
• Lifetime earnings tracking

How it works:
1. Share your unique referral link with friends and colleagues
2. When someone signs up and purchases a plan using your link, you earn commission
3. Track your earnings in real-time through your dashboard
4. Request payout once you reach the $25 threshold
5. Receive payment within 7 business days

Commission is calculated based on the plan price and will be available for payout once you reach the minimum threshold. All referrals are tracked automatically and commissions are credited instantly upon successful plan purchase.',
        ];
    }

    private function getMainSettings(): array
    {
        return [
            'is_enabled' => true,
            'commission_percentage' => 10.00,
            'threshold_amount' => 50.00,
            'guidelines' => 'Welcome to our referral program! Earn commission when users sign up using your referral link and purchase a plan. 

Program Details:
• Earn 10% commission on successful referrals
• Minimum payout threshold: $50
• Commission calculated on plan purchase price
• Payouts processed monthly

How to participate:
1. Share your unique referral link
2. Track referrals in your dashboard
3. Earn commission when referred users purchase plans
4. Request payout once threshold is reached

Commission is calculated based on the plan price and will be available for payout once you reach the minimum threshold.',
        ];
    }
}