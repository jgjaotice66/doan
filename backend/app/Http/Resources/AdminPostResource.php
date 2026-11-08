<?php

namespace App\Http\Resources;

use App\Models\Post;
use Illuminate\Http\Request;

/**
 * Bài viết phía admin = dữ liệu storefront + trạng thái (nháp/hẹn giờ/đã đăng).
 *
 * @mixin Post
 */
class AdminPostResource extends PostResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = $this->status();

        return [
            ...parent::toArray($request),
            'is_published' => $this->is_published,
            'status' => ['value' => $status, 'label' => Post::STATUS_LABELS[$status]],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
