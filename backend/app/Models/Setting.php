<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Một dòng cài đặt cửa hàng. Đọc/ghi qua App\Support\ShopSettings (có cache), không dùng trực tiếp.
 */
#[Fillable(['key', 'value'])]
class Setting extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;
}
