<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Tin tức công khai: chỉ bài đã xuất bản và đã tới giờ đăng.
 */
class PostController extends Controller
{
    /** Khối nổi bật = 1 bài to + 2 bài nhỏ. */
    private const HIGHLIGHT_COUNT = 3;

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:24'],
            // Bỏ các bài đã hiện ở chỗ khác (bài đang xem, khối nổi bật): "3" hoặc "3,7,9".
            'exclude' => ['nullable', 'string', 'regex:/^\d+(,\d+)*$/'],
        ]);

        $exclude = isset($validated['exclude']) ? array_map('intval', explode(',', $validated['exclude'])) : [];

        $posts = $this->listQuery()
            ->when($exclude, fn ($query) => $query->whereKeyNot($exclude))
            ->paginate($validated['per_page'] ?? 9);

        return PostResource::collection($posts);
    }

    /**
     * Khối nổi bật: bài to = bài ghim (tin hot) mới nhất, không ghim bài nào thì lấy bài mới nhất;
     * tiếp theo là các bài mới nhất còn lại.
     */
    public function highlights(): AnonymousResourceCollection
    {
        $hero = $this->listQuery()->where('is_featured', true)->first() ?? $this->listQuery()->first();

        if (! $hero) {
            return PostResource::collection([]);
        }

        $others = $this->listQuery()->whereKeyNot($hero->id)->limit(self::HIGHLIGHT_COUNT - 1)->get();

        return PostResource::collection($others->prepend($hero));
    }

    /**
     * Bài nháp / hẹn giờ trả 404 như bài không tồn tại.
     */
    public function show(string $slug): PostResource
    {
        $post = Post::published()->with('author:id,name')->where('slug', $slug)->firstOrFail();

        return new PostResource($post);
    }

    /**
     * Bài đã đăng, mới nhất trước, không kèm nội dung.
     */
    private function listQuery()
    {
        return Post::published()
            ->select(Post::LIST_COLUMNS)
            ->with('author:id,name')
            ->latest('published_at')
            ->latest('id');
    }
}
