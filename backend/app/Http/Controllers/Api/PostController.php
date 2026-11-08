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
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:24'],
        ]);

        $posts = Post::published()
            ->select(Post::LIST_COLUMNS)
            ->with('author:id,name')
            ->latest('published_at')
            ->latest('id')
            ->paginate($validated['per_page'] ?? 9);

        return PostResource::collection($posts);
    }

    /**
     * Bài nháp / hẹn giờ trả 404 như bài không tồn tại.
     */
    public function show(string $slug): PostResource
    {
        $post = Post::published()->with('author:id,name')->where('slug', $slug)->firstOrFail();

        return new PostResource($post);
    }
}
