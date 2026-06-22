<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'category',
        'provider',
        'language',
        'price',
        'link',
        'description',
        'duration',
        'teacher',
        'course_image_url',
        'level',
        'learning_material',
    ];

    protected function casts(): array
    {
        return [
            'price'             => 'decimal:2',
            'learning_material' => 'array',
        ];
    }


}
