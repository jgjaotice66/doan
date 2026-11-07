<?php

namespace App\Http\Resources;

use App\Models\Banner;
use Illuminate\Http\Request;

/**
 * Banner phía admin = dữ liệu storefront + trạng thái bật/tắt.
 *
 * @mixin Banner
 */
class AdminBannerResource extends BannerResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'is_active' => $this->is_active,
            'updated_at' => $this->updated_at,
        ];
    }
}
