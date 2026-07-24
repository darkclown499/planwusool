<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Store;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\StoreCoupon;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $stores = Store::all();

        foreach ($stores as $store) {
            $customers = Customer::where('store_id', $store->id)->get();
            $products = Product::where('store_id', $store->id)->get();
            $shippingMethods = Shipping::where('store_id', $store->id)->get();
            $coupons = StoreCoupon::where('store_id', $store->id)->where('status', true)->get();

            if ($customers->isEmpty() || $products->isEmpty() || $shippingMethods->isEmpty()) {
                continue;
            }

            // Create 5-10 orders per store
            $orderCount = rand(5, 10);
            $usedCoupons = [];
            
            for ($i = 0; $i < $orderCount; $i++) {
                $customer = $customers->random();
                $shippingMethod = $shippingMethods->random();
                
                // Get customer addresses
                $billingAddress = $customer->addresses()->where('type', 'billing')->first();
                $shippingAddress = $customer->addresses()->where('type', 'shipping')->first();
                
                $order = Order::create([
                    'order_number' => Order::generateOrderNumber(),
                    'store_id' => $store->id,
                    'customer_id' => $customer->id,
                    'status' => $this->getRandomStatus(),
                    'payment_status' => $this->getRandomPaymentStatus(),
                    'customer_email' => $customer->email,
                    'customer_phone' => $customer->phone,
                    'customer_first_name' => $customer->first_name,
                    'customer_last_name' => $customer->last_name,
                    'shipping_address' => $shippingAddress->address ?? fake()->streetAddress(),
                    'shipping_city' => $shippingAddress->city ?? fake()->city(),
                    'shipping_state' => $shippingAddress->state ?? fake()->state(),
                    'shipping_postal_code' => $shippingAddress->postal_code ?? fake()->postcode(),
                    'shipping_country' => $shippingAddress->country ?? 'United States',
                    'billing_address' => $billingAddress->address ?? fake()->streetAddress(),
                    'billing_city' => $billingAddress->city ?? fake()->city(),
                    'billing_state' => $billingAddress->state ?? fake()->state(),
                    'billing_postal_code' => $billingAddress->postal_code ?? fake()->postcode(),
                    'billing_country' => $billingAddress->country ?? 'United States',
                    'subtotal' => 0,
                    'tax_amount' => 0,
                    'discount_amount' => 0,
                    'total_amount' => 0,
                    'payment_method' => $this->getRandomPaymentMethod(),
                    'shipping_method_id' => $shippingMethod->id,
                    'shipping_amount' => $shippingMethod->cost,
                    'created_at' => fake()->dateTimeBetween('-2 months', 'now'),
                    'updated_at' => fake()->dateTimeBetween('-2 months', 'now'),
                ]);

                // Add 1-4 items per order
                $itemCount = rand(1, 4);
                $subtotal = 0;
                
                for ($j = 0; $j < $itemCount; $j++) {
                    $product = $products->random();
                    $quantity = rand(1, 3);
                    $unitPrice = $product->sale_price ?? $product->price;
                    $totalPrice = $unitPrice * $quantity;
                    $subtotal += $totalPrice;

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'product_sku' => $product->sku,
                        'product_price' => $product->price,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'total_price' => $totalPrice,
                    ]);
                }

                // Calculate totals
                $taxAmount = $subtotal * 0.08; // 8% tax
                $discountAmount = 0;
                $couponCode = null;
                
                // Ensure each coupon is used at least once
                if (!$coupons->isEmpty()) {
                    $unusedCoupons = $coupons->whereNotIn('id', $usedCoupons);
                    
                    if ($unusedCoupons->isNotEmpty()) {
                        // Use an unused coupon
                        $coupon = $unusedCoupons->first();
                        $usedCoupons[] = $coupon->id;
                    } elseif (rand(1, 100) <= 30) {
                        // 30% chance to reuse a coupon
                        $coupon = $coupons->random();
                    }
                    
                    if (isset($coupon)) {
                        $couponCode = $coupon->code;
                        
                        if ($coupon->type === 'percentage') {
                            $discountAmount = ($subtotal * $coupon->discount_amount) / 100;
                        } else {
                            $discountAmount = $coupon->discount_amount;
                        }
                        
                        // Ensure discount doesn't exceed subtotal
                        $discountAmount = min($discountAmount, $subtotal);
                    }
                }
                
                $totalAmount = $subtotal + $taxAmount + $order->shipping_amount - $discountAmount;

                $order->update([
                    'subtotal' => $subtotal,
                    'tax_amount' => $taxAmount,
                    'discount_amount' => $discountAmount,
                    'total_amount' => $totalAmount,
                    'coupon_code' => $couponCode,
                ]);
            }
        }

    }

    private function getRandomStatus(): string
    {
        $statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        return $statuses[array_rand($statuses)];
    }

    private function getRandomPaymentStatus(): string
    {
        $statuses = ['pending', 'paid', 'failed', 'refunded'];
        return $statuses[array_rand($statuses)];
    }

    private function getRandomPaymentMethod(): string
    {
        $methods = ['stripe', 'paypal', 'bank', 'cod'];
        return $methods[array_rand($methods)];
    }
}