<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
putenv('APP_ENV=testing');
config(['database.default' => 'sqlite']);
config(['database.connections.sqlite.database' => 'storage/testing.sqlite']);
use App\Models\Store;
use App\Models\Product;
use App\Models\Category;
$s = Store::where('slug','e2e-test-store')->first();
if (!$s) { echo "no store\n"; exit; }
echo "store id {$s->id} name {$s->name} slug {$s->slug} user_id {$s->user_id}\n";
echo "products ".Product::where('store_id',$s->id)->count()."\n";
echo "categories ".Category::where('store_id',$s->id)->count()."\n";
echo "is_active ".($s->is_active?'1':'0')."\n";
$p = Product::where('store_id',$s->id)->first();
if ($p) echo "first product {$p->name} price {$p->price} is_active ".($p->is_active?'1':'0')."\n";
