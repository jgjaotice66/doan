<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ảnh / video bằng chứng của yêu cầu trả hàng (type = image | video).
 */
#[Fillable(['return_request_id', 'path', 'type'])]
class ReturnRequestMedia extends Model
{
    protected $table = 'return_request_media';

    /**
     * @return BelongsTo<ReturnRequest, $this>
     */
    public function returnRequest(): BelongsTo
    {
        return $this->belongsTo(ReturnRequest::class);
    }
}
