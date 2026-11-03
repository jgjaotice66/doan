<?php

namespace App\Http\Resources;

use App\Models\Banner;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Banner
 */
class BannerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'image' => Media::url($this->image),
            'link' => $this->link,
            'sort_order' => $this->sort_order,
        ];
    }
}
