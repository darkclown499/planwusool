<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use RuntimeException;
use Tests\Support\Qa\QaFixtureBuilder;

/**
 * Deterministic, environment-guarded QA fixture for local/testing browser QA.
 *
 * SAFETY: delegates to QaFixtureBuilder which refuses to run outside the
 * local/testing environments, refuses non-sqlite connections and refuses
 * production-like database names. It never touches production auth, OTP,
 * email verification, or real merchant data. The generated merchant logs in
 * through the normal /login password flow.
 */
class QaFixtureCommand extends Command
{
    protected $signature = 'qa:fixture
        {--reset : Delete only QA-owned fixture state created by this tool}
        {--products=0 : Number of QA products to create}
        {--orders=0 : Number of QA orders to create}
        {--plan=qa : Plan for the merchant (qa | Starter | Growth | Professional)}
        {--shipping : Also create one active shipping method}
        {--payment : Also enable a payment configuration (COD)}
        {--email=merchant@qa.example.test : QA merchant email (must end with @qa.example.test)}
        {--store-slug=qa-store : QA store slug}
        {--role=company : Role granted to the merchant}
        {--permissions=* : Extra permission names to grant the merchant (repeatable)}';

    protected $description = 'Create/reset a durable local/testing authenticated merchant QA fixture (refuses production).';

    public function handle(): int
    {
        $options = [
            'email' => (string) $this->option('email'),
            'password' => (string) env('QA_MERCHANT_PASSWORD', 'password'),
            'role' => (string) $this->option('role'),
            'plan' => (string) $this->option('plan'),
            'storeSlug' => (string) $this->option('store-slug'),
            'permissions' => (array) $this->option('permissions'),
            'productCount' => max(0, (int) $this->option('products')),
            'orderCount' => max(0, (int) $this->option('orders')),
            'states' => $this->statesFromOptions(),
        ];

        $builder = new QaFixtureBuilder($options);

        try {
            if ($this->option('reset')) {
                $deleted = $builder->reset();
                $this->components->info('QA fixture reset completed in ['.app()->environment().'].');

                foreach ($deleted as $label => $count) {
                    $this->line('  <fg=gray>'.$label.':</> '.$count);
                }

                return self::SUCCESS;
            }

            $builder->create();

            $this->components->info('QA fixture ready in ['.app()->environment().'].');
            $this->components->twoColumnDetail('Merchant email', $builder->user()->email);
            $this->components->twoColumnDetail('Store slug', $builder->store()->slug);
            $this->components->twoColumnDetail('Store id', (string) $builder->store()->id);
            $this->components->twoColumnDetail('Plan', $builder->plan()->name);
            $this->components->twoColumnDetail('Role', (string) $builder->user()->getRoleNames()->implode(', '));
            $this->components->twoColumnDetail('Extra permissions', implode(', ', (array) $this->option('permissions')) ?: 'none');
            $this->components->twoColumnDetail('Products / Orders', $this->option('products').' / '.$this->option('orders'));
            $this->components->twoColumnDetail('Shipping / Payment', $this->option('shipping') ? 'yes' : 'no'.' / '.($this->option('payment') ? 'yes' : 'no'));
            $this->components->warn('Use the normal /login page with the merchant email and QA_MERCHANT_PASSWORD.');

            return self::SUCCESS;
        } catch (RuntimeException $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }
    }

    protected function statesFromOptions(): array
    {
        $states = [];

        if ($this->option('shipping')) {
            $states[] = QaFixtureBuilder::STATE_SHIPPING;
        }

        if ($this->option('payment')) {
            $states[] = QaFixtureBuilder::STATE_PAYMENT;
        }

        if ((int) $this->option('products') > 0) {
            $states[] = QaFixtureBuilder::STATE_PRODUCTS;
        }

        if ((int) $this->option('orders') > 0) {
            $states[] = QaFixtureBuilder::STATE_ORDERS;
        }

        return $states;
    }
}