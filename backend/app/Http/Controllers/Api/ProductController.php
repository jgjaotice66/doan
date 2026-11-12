<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductIndexRequest;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Queries\ProductFilter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    public function index(ProductIndexRequest $request): AnonymousResourceCollection
    {
        $query = Product::query()
            ->active()
            ->with(['brand', 'category.parent', 'images' => fn ($q) => $q->limit(2)]);

        $products = ProductFilter::apply($query, $request->validated())
            ->paginate($request->perPage())
            ->withQueryString();

        return ProductResource::collection($products);
    }

    /**
     * Chi tiết sản phẩm đang bán; sản phẩm ẩn/đã xoá trả 404.
     */
    public function show(Request $request, string $slug): ProductDetailResource
    {
        $product = Product::query()
            ->active()
            ->where('slug', $slug)
            ->with(['brand', 'category.parent', 'images'])
            ->firstOrFail();

        // Route công khai: chỉ kiểm tra yêu thích khi khách gửi kèm token.
        $user = $request->user('sanctum');
        $product->is_wishlisted = $user !== null
            && $user->wishlist()->whereKey($product->id)->exists();

        $product->setRelation('related', Product::query()
            ->active()
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->with(['brand', 'category.parent', 'images' => fn ($q) => $q->limit(2)])
            ->latest()
            ->limit(8)
            ->get());

        return new ProductDetailResource($product);
    }
}
