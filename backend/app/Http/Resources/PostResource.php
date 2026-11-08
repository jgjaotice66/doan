<?php

namespace App\Http\Resources;

use App\Models\Post;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bài viết phía storefront. `content` chỉ có khi đã tải cột này (trang chi tiết),
 * danh sách chọn Post::LIST_COLUMNS nên không kèm nội dung.
 *
 * @mixin Post
 */
class PostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'thumbnail' => Media::url($this->thumbnail),
            'excerpt' => $this->excerpt,
            'is_featured' => $this->is_featured,
            'content' => $this->whenHas('content'),
            'published_at' => $this->published_at,
            'author' => $this->whenLoaded('author', fn () => ['name' => $this->author->name]),
        ];
    }
}
