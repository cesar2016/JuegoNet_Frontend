<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExtractNumber extends Model
{
    public $timestamps = false;

    protected $fillable = ['extract_id', 'position', 'number'];

    public function extract()
    {
        return $this->belongsTo(Extract::class);
    }
}
