<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreSetting extends Model
{
    protected $fillable = ['store_id', 'theme', 'content'];
    protected $casts = ['content' => 'array'];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public static function getSettings($storeId, $theme = 'default')
    {
        $settings = self::where('store_id', $storeId)
                       ->where('theme', $theme)
                       ->first();
        
        return $settings ? $settings->content : [];
    }
    
    public static function updateSettings($storeId, $theme, $content)
    {
        return self::updateOrCreate(
            ['store_id' => $storeId, 'theme' => $theme],
            ['content' => $content]
        );
    }
    

}