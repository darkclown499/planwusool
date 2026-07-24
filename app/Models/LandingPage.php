<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPage extends Model
{
    protected $fillable = [
        'name',
        'layout',
        'global_settings',
        'is_published'
    ];

    protected $casts = [
        'layout' => 'array',
        'global_settings' => 'array',
        'is_published' => 'boolean'
    ];
}