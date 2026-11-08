<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PostRequest;
use App\Http\Resources\AdminPostResource;
use App\Models\Post;
use App\Support\Media;
use App\Support\PostContent;
use App\Support\Slug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

/**
 * Quản trị tin tức. Nội dung HTML luôn được lọc (PostContent::clean) trước khi lưu.
 */
class PostController extends Controller
{
    private const THUMBNAIL_DIR = 'posts';

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:draft,scheduled,published'],
            'featured' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $posts = Post::query()
            ->select(Post::LIST_COLUMNS)
            ->with('author:id,name')
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->where('title', 'like', "%{$q}%"))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->{$status}())
            ->when($request->boolean('featured'), fn ($query) => $query->where('is_featured', true))
            ->latest('updated_at')
            ->latest('id')
            ->paginate($validated['per_page'] ?? 10);

        return AdminPostResource::collection($posts);
    }

    public function show(Post $post): AdminPostResource
    {
        return new AdminPostResource($post->load('author:id,name'));
    }

    public function store(PostRequest $request): JsonResponse
    {
        $post = Media::swap(null, $request->file('thumbnail'), false, self::THUMBNAIL_DIR, fn (?string $thumbnail) => Post::create([
            ...$this->fields($request),
            'author_id' => $request->user()->id,
            'thumbnail' => $thumbnail,
        ]));

        return (new AdminPostResource($post->load('author:id,name')))->response()->setStatusCode(201);
    }

    /**
     * Không gửi ảnh → giữ ảnh cũ; remove_thumbnail=1 → gỡ ảnh.
     * Ảnh chèn trong bài mà bị bỏ khỏi nội dung thì xoá luôn file.
     */
    public function update(PostRequest $request, Post $post): AdminPostResource
    {
        $before = $post->content;

        Media::swap($post->thumbnail, $request->file('thumbnail'), $request->boolean('remove_thumbnail'), self::THUMBNAIL_DIR, fn (?string $thumbnail) => $post->update([
            ...$this->fields($request, $post),
            'thumbnail' => $thumbnail,
        ]));

        PostContent::deleteUnusedImages($before, $post->content);

        return new AdminPostResource($post->load('author:id,name'));
    }

    public function destroy(Post $post): Response
    {
        $post->delete();
        Media::delete($post->thumbnail);
        PostContent::deleteUnusedImages($post->content);

        return response()->noContent();
    }

    /**
     * Ảnh chèn trong nội dung (nút ảnh của trình soạn thảo) → trả URL để chèn vào bài,
     * tránh việc trình soạn thảo nhét ảnh base64 thẳng vào HTML.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ], [
            'image.required' => 'Vui lòng chọn ảnh.',
            'image.image' => 'File phải là ảnh.',
            'image.mimes' => 'Ảnh phải có định dạng jpg, png, webp hoặc gif.',
            'image.max' => 'Ảnh tối đa 5MB.',
            'image.uploaded' => 'Tải ảnh lên thất bại (file có thể quá lớn), vui lòng thử lại.',
        ]);

        $path = Media::store($request->file('image'), PostContent::IMAGE_DIR);

        return response()->json(['url' => Media::url($path)], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function fields(PostRequest $request, ?Post $post = null): array
    {
        $title = $request->validated('title');
        $content = PostContent::clean($request->validated('content'));
        $isPublished = $request->boolean('is_published');

        // Giờ admin chọn kèm múi giờ (+07:00) → đổi về múi giờ ứng dụng (UTC) trước khi lưu.
        $publishedAt = $request->validated('published_at')
            ? Carbon::parse($request->validated('published_at'))->setTimezone(config('app.timezone'))
            : $post?->published_at;

        return [
            'title' => $title,
            'slug' => $request->validated('slug') ?: Slug::unique(Post::class, $title, $post?->id),
            'excerpt' => $request->validated('excerpt') ?: PostContent::excerpt($content),
            'content' => $content,
            'is_published' => $isPublished,
            'is_featured' => $request->boolean('is_featured'),
            // Bật xuất bản mà chưa có ngày → đăng ngay.
            'published_at' => $isPublished ? ($publishedAt ?? now()) : $publishedAt,
        ];
    }
}
