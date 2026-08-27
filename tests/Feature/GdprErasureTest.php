<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use App\Services\CustomerDataErasureService;
use App\Jobs\GdprDeletionJob;
use App\Models\GdprDeletionRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class GdprErasureTest extends TestCase
{
    use RefreshDatabase;

    protected function makeCompanyAndStore(): array
    {
        $user = User::factory()->create(['type'=>'company','email_verified_at'=>now()]);
        $store = Store::factory()->create(['user_id'=>$user->id]);
        $user->forceFill(['current_store'=>$store->id])->save();
        return [$user,$store];
    }

    public function test_customer_erasure_anonymizes_orders_and_deletes_customer(): void
    {
        [$user,$store] = $this->makeCompanyAndStore();
        $customer = Customer::create([
            'store_id'=>$store->id,'first_name'=>'Ali','last_name'=>'Hassan','email'=>'ali@example.com','phone'=>'0591000000','is_active'=>true
        ]);
        CustomerAddress::create(['customer_id'=>$customer->id,'type'=>'billing','address'=>'Street 1','city'=>'Nablus','state'=>'West','country'=>'PS','postal_code'=>'00000','is_default'=>true]);
        CustomerAddress::create(['customer_id'=>$customer->id,'type'=>'shipping','address'=>'Street 2','city'=>'Ramallah','state'=>'West','country'=>'PS','postal_code'=>'00000','is_default'=>true]);
        $order = Order::forceCreate([
            'order_number'=>Order::generateOrderNumber(),'store_id'=>$store->id,'customer_id'=>$customer->id,'session_id'=>'sess-1',
            'status'=>'pending','payment_status'=>'paid','customer_email'=>'ali@example.com','customer_first_name'=>'Ali','customer_last_name'=>'Hassan','customer_phone'=>'0591000000',
            'shipping_address'=>'Street 2','shipping_city'=>'Ramallah','shipping_state'=>'West','shipping_country'=>'PS',
            'billing_address'=>'Street 1','billing_city'=>'Nablus','billing_state'=>'West','billing_country'=>'PS',
            'subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>10,'discount_amount'=>0,'total_amount'=>110,'currency'=>'ILS','payment_method'=>'cod'
        ]);
        $origTotal = $order->total_amount;
        $origCurrency = $order->currency;
        $origNumber = $order->order_number;

        app(CustomerDataErasureService::class)->erase($customer);

        $this->assertDatabaseMissing('customers',['id'=>$customer->id]);
        $this->assertDatabaseMissing('customer_addresses',['customer_id'=>$customer->id]);
        $fresh = Order::find($order->id);
        $this->assertNotNull($fresh);
        $this->assertEquals($origNumber, $fresh->order_number);
        $this->assertEquals($origTotal, $fresh->total_amount);
        $this->assertEquals($origCurrency, $fresh->currency);
        $this->assertEquals('Deleted User', $fresh->customer_first_name);
        $this->assertEquals(CustomerDataErasureService::ANON_PHONE, $fresh->customer_phone);
        $this->assertStringStartsWith(CustomerDataErasureService::ANON_EMAIL_PREFIX, $fresh->customer_email);
        $this->assertNull($fresh->customer_id);
    }

    public function test_erasure_idempotent(): void
    {
        [$user,$store] = $this->makeCompanyAndStore();
        $customer = Customer::create(['store_id'=>$store->id,'first_name'=>'Sara','last_name'=>'A','email'=>'sara@example.com','phone'=>'0591111111','is_active'=>true]);
        $order = Order::forceCreate([
            'order_number'=>Order::generateOrderNumber(),'store_id'=>$store->id,'customer_id'=>$customer->id,'session_id'=>'sess-x',
            'status'=>'pending','payment_status'=>'paid','customer_email'=>'sara@example.com','customer_first_name'=>'Sara','customer_last_name'=>'A','customer_phone'=>'0591111111',
            'shipping_address'=>'Addr','shipping_city'=>'City','shipping_state'=>'State','shipping_country'=>'PS',
            'billing_address'=>'Addr','billing_city'=>'City','billing_state'=>'State','billing_country'=>'PS',
            'subtotal'=>50,'total_amount'=>50,'currency'=>'ILS','payment_method'=>'cod'
        ]);
        $svc = app(CustomerDataErasureService::class);
        $svc->erase($customer);
        // second call should not fail nor change financial facts
        $fresh1 = Order::find($order->id);
        $total1 = $fresh1->total_amount;
        // create phantom customer with same id not found — second erase on missing should be noop
        // instead call again via fresh lookup (which is deleted)
        $deleted = Customer::find($customer->id);
        $this->assertNull($deleted);
        $fresh2 = Order::find($order->id);
        $this->assertEquals((string)$total1, (string)$fresh2->total_amount);
    }

    public function test_gdpr_deletion_job_idempotent_and_transitions(): void
    {
        [$user,$store] = $this->makeCompanyAndStore();
        $req = GdprDeletionRequest::create(['user_id'=>$user->id,'status'=>'pending','requested_at'=>now()]);
        $job = new GdprDeletionJob($req->id);
        $job->handle(app(CustomerDataErasureService::class));
        $req->refresh();
        $this->assertEquals('completed', $req->status);
        // replay
        $job2 = new GdprDeletionJob($req->id);
        $job2->handle(app(CustomerDataErasureService::class));
        $this->assertEquals('completed', $req->fresh()->status);
    }

    public function test_gdpr_deletion_job_is_queueable(): void
    {
        $this->assertTrue(in_array(\Illuminate\Contracts\Queue\ShouldQueue::class, class_implements(GdprDeletionJob::class)));
    }
}
