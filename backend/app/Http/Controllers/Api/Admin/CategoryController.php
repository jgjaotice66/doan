<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Support\Media;
use App\Support\Slug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * Quản trị danh mục. Ảnh gửi multipart; sửa có ảnh thì POST kèm _method=PUT.
 */
class CategoryController extends Controller
{
    private const IMAGE_DIR = 'categories';

    /**
     * Danh sách phân trang, tìm theo tên/slug. Xếp theo cây: mỗi danh mục gốc rồi tới các con của nó.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $categories = Category::query()
            ->with('parent')
            ->withCount('products')
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->where(
                fn ($query) => $query->where('name', 'like', "%{$q}%")->orWhere('slug', 'like', "%{$q}%"),
            ))
            ->orderByRaw('COALESCE(parent_id, id), parent_id IS NOT NULL, name')
            ->paginate($validated['per_page'] ?? 10);

        return CategoryResource::collection($categories);
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        $category = Media::swap(null, $request->file('image'), false, self::IMAGE_DIR, fn (?string $image) => Category::create([
            'name' => $request->validated('name'),
            'slug' => Slug::unique(Category::class, $request->validated('name')),
            'parent_id' => $request->validated('parent_id'),
            'image' => $image,
        ]));

        return $this->resource($category)->response()->setStatusCode(201);
    }

    public function update(CategoryRequest $request, Category $category): CategoryResource
    {
        $name = $request->validated('name');

        Media::swap($category->image, $request->file('image'), $request->boolean('remove_image'), self::IMAGE_DIR, fn (?string $image) => $category->update([
            'name' => $name,
            // Đổi tên thì slug đổi theo (giữ nguyên nếu tên không đổi).
            'slug' => $name === $category->name ? $category->slug : Slug::unique(Category::class, $name, $category->id),
            'parent_id' => $request->validated('parent_id'),
            'image' => $image,
        ]));

        return $this->resource($category);
    }

    /**
     * Chặn xoá khi còn sản phẩm (kể cả sản phẩm đã xoá mềm — khoá ngoại vẫn trỏ tới) hoặc còn danh mục con.
     */
    public function destroy(Category $category): Response
    {
        $products = $category->products()->withTrashed()->count();
        if ($products > 0) {
            throw ValidationException::withMessages([
                'category' => "Danh mục còn {$products} sản phẩm (tính cả sản phẩm đã xoá). Hãy chuyển chúng sang danh mục khác trước khi xoá.",
            ]);
        }

        $children = $category->children()->count();
        if ($children > 0) {
            throw ValidationException::withMessages([
                'category' => "Danh mục còn {$children} danh mục con. Hãy xoá hoặc chuyển chúng trước.",
            ]);
        }

        $category->delete();
        Media::delete($category->image);

        return response()->noContent();
    }

    private function resource(Category $category): CategoryResource
    {
        return new CategoryResource($category->load('parent')->loadCount('products'));
    }
}
