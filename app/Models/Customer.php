<?php

namespace App\Models;

use App\Events\CustomerCreated;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Customer extends Authenticatable
{
    use Notifiable;
    protected $dispatchesEvents = [
        'created' => CustomerCreated::class,
    ];
    
    protected $appends = ['full_name', 'avatar_url', 'initials'];
    protected $fillable = [
        'store_id',
        'first_name',
        'last_name',
        'email',
        'email_verified_at',
        'password',
        'phone',
        'date_of_birth',
        'gender',
        'notes',
        'avatar',
        'is_active',
        'preferred_language',
        'customer_group',
        'email_marketing',
        'sms_notifications',
        'order_updates',
        'total_orders',
        'total_spent'
    ];
    
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'date_of_birth' => 'date',
        'is_active' => 'boolean',
        'email_marketing' => 'boolean',
        'sms_notifications' => 'boolean',
        'order_updates' => 'boolean',
        'total_orders' => 'integer',
        'total_spent' => 'float',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function addresses()
    {
        return $this->hasMany(CustomerAddress::class);
    }

    public function billingAddress()
    {
        return $this->hasOne(CustomerAddress::class)->where('type', 'billing')->where('is_default', true);
    }

    public function shippingAddress()
    {
        return $this->hasOne(CustomerAddress::class)->where('type', 'shipping')->where('is_default', true);
    }

    public function getFullNameAttribute()
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getAvatarAttribute($value)
    {
        return $value ? get_file($value) : null;
    }

    public function getAvatarUrlAttribute()
    {
        return $this->avatar;
    }

    public function getInitialsAttribute()
    {
        return strtoupper(mb_substr($this->first_name, 0, 1) . mb_substr($this->last_name, 0, 1));
    }

    protected static function boot()
    {
        parent::boot();
        // Event dispatching handled by $dispatchesEvents property
    }
}