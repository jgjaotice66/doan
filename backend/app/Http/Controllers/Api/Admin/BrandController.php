<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BrandRequest;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use App\Support\Media;
use App\Support\Slug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * Quản trị thương hiệu. Logo gửi multipart; sửa có logo thì POST kèm _method=PUT.
 */
class BrandController extends Controller
{
    private const LOGO_DIR = 'brands';

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $brands = Brand::query()
            ->withCount('products')
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->where(
                fn ($query) => $query->where('name', 'like', "%{$q}%")->orWhere('slug', 'like', "%{$q}%"),
            ))
            ->orderBy('name')
            ->paginate($validated['per_page'] ?? 10);

        return BrandResource::collection($brands);
    }

    public function store(BrandRequest $request): JsonResponse
    {
        $brand = Media::swap(null, $request->file('logo'), false, self::LOGO_DIR, fn (?string $logo) => Brand::create([
            'name' => $request->validated('name'),
            'slug' => Slug::unique(Brand::class, $request->validated('name')),
            'logo' => $logo,
        ]));

        return (new BrandResource($brand->loadCount('products')))->response()->setStatusCode(201);
    }

    public function update(BrandRequest $request, Brand $brand): BrandResource
    {
        $name = $request->validated('name');

        Media::swap($brand->logo, $request->file('logo'), $request->boolean('remove_logo'), self::LOGO_DIR, fn (?string $logo) => $brand->update([
            'name' => $name,
            'slug' => $name === $brand->name ? $brand->slug : Slug::unique(Brand::class, $name, $brand->id),
            'logo' => $logo,
        ]));

        return new BrandResource($brand->loadCount('products'));
    }

    /**
     * Chặn xoá khi còn sản phẩm (kể cả sản phẩm đã xoá mềm — khoá ngoại vẫn trỏ tới).
     */
    public function destroy(Brand $brand): Response
    {
        $products = $brand->products()->withTrashed()->count();
        if ($products > 0) {
            throw ValidationException::withMessages([
                'brand' => "Thương hiệu còn {$products} sản phẩm (tính cả sản phẩm đã xoá). Hãy chuyển chúng sang thương hiệu khác trước khi xoá.",
            ]);
        }

        $brand->delete();
        Media::delete($brand->logo);

        return response()->noContent();
    }
}
