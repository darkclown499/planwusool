<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use App\Services\StorageConfigService;

class MediaItem extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;

    protected $fillable = ['name', 'description'];

    public function registerMediaCollections(): void
    {
        \App\Services\DynamicStorageService::configureDynamicDisks();

        $config = StorageConfigService::getStorageConfig();
        $allowedExtensions = array_map('trim', explode(',', strtolower($config['allowed_file_types'])));
        $maxSizeBytes = ($config['max_file_size_mb'] ?? 2) * 1024 * 1024;

        $this->addMediaCollection('images')
            ->acceptsFile(function ($file) use ($allowedExtensions, $maxSizeBytes) {
                $fileName = $file->name ?? $file->getFilename();
                $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

                if (!in_array($extension, $allowedExtensions)) {
                    return false;
                }

                $fileSize = $file->size ?? @filesize($file->getPathname());
                if ($fileSize !== false && $fileSize > $maxSizeBytes) {
                    return false;
                }

                return true;
            })
            ->useDisk(StorageConfigService::getActiveDisk());
    }

    public function registerMediaConversions(Media $media = null): void
    {
        \App\Services\DynamicStorageService::configureDynamicDisks();

        // thumb 300x300 - used for tiny previews, remains non-queued
        $this->addMediaConversion('thumb')
            ->width(300)
            ->height(300)
            ->sharpen(10)
            ->performOnCollections('images')
            ->nonQueued();

        // small 400 - ideal for product grid cards (200-300px displayed)
        $this->addMediaConversion('small')
            ->width(400)
            ->height(400)
            ->sharpen(8)
            ->performOnCollections('images')
            ->nonQueued();

        // medium 800 - hero / detail / banner (400-800px displayed)
        $this->addMediaConversion('medium')
            ->width(800)
            ->height(800)
            ->sharpen(5)
            ->performOnCollections('images')
            ->nonQueued();
    }
}
