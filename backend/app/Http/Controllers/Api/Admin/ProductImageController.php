<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\ProductImageResource;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\ProductImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Ảnh sản phẩm: thêm nhiều ảnh, xoá từng ảnh (xoá cả file), sắp xếp lại (ảnh đầu = ảnh đại diện).
 */
class ProductImageController extends Controller
{
    public function __construct(private ProductImageService $images) {}

    /**
     * Thêm ảnh vào cuối. Trả về toàn bộ ảnh của sản phẩm theo thứ tự mới.
     */
    public function store(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ], [
            'images.required' => 'Vui lòng chọn ít nhất 1 ảnh.',
            'images.*.image' => 'File phải là ảnh.',
            'images.*.mimes' => 'Ảnh phải có định dạng jpg, png hoặc webp.',
            'images.*.max' => 'Mỗi ảnh tối đa 2MB.',
        ]);

        $current = $product->images()->count();
        $adding = count($request->file('images'));
        if ($current + $adding > ProductRequest::MAX_IMAGES) {
            throw ValidationException::withMessages([
                'images' => 'Mỗi sản phẩm tối đa '.ProductRequest::MAX_IMAGES." ảnh (đang có {$current}, chỉ thêm được ".max(0, ProductRequest::MAX_IMAGES - $current).' ảnh nữa).',
            ]);
        }

        $this->images->attach($product, $request->file('images'));

        return $this->list($product)->response()->setStatusCode(201);
    }

    /**
     * ids = toàn bộ id ảnh của sản phẩm theo thứ tự mới (không thiếu, không thừa).
     */
    public function reorder(Request $request, Product $product): AnonymousResourceCollection
    {
        $ownIds = $product->images()->pluck('id')->all();

        $validated = $request->validate([
            'ids' => ['required', 'array', 'size:'.count($ownIds)],
            'ids.*' => ['integer', 'distinct', Rule::in($ownIds)],
        ], [
            'ids.required' => 'Danh sách ảnh trống.',
            'ids.size' => 'Danh sách phải gồm đúng tất cả ảnh của sản phẩm.',
            'ids.*.in' => 'Có ảnh không thuộc sản phẩm này.',
        ]);

        $this->images->reorder($product, $validated['ids']);

        return $this->list($product);
    }

    public function destroy(ProductImage $productImage): Response
    {
        $this->images->delete($productImage);

        return response()->noContent();
    }

    private function list(Product $product): AnonymousResourceCollection
    {
        return ProductImageResource::collection($product->images()->get());
    }
}
