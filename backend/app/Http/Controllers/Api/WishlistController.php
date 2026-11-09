<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\WishlistRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class WishlistController extends Controller
{
    /**
     * Sản phẩm yêu thích còn đang bán, mới thích nằm trên cùng.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $products = $request->user()->wishlist()
            ->active()
            ->with(['brand', 'category.parent', 'images' => fn ($q) => $q->limit(1)])
            ->orderByPivot('created_at', 'desc')
            ->orderByPivot('id', 'desc')
            ->get();

        return ProductResource::collection($products);
    }

    /**
     * Thêm vào yêu thích; đã có thì giữ nguyên (không tạo trùng).
     */
    public function store(WishlistRequest $request): JsonResponse
    {
        $product = Product::with(['brand', 'images' => fn ($q) => $q->limit(1)])
            ->findOrFail($request->integer('product_id'));

        $request->user()->wishlist()->syncWithoutDetaching([$product->id]);

        return (new ProductResource($product))->response()->setStatusCode(201);
    }

    /**
     * Bỏ khỏi yêu thích; không có sẵn cũng trả 204.
     */
    public function destroy(Request $request, int $productId): Response
    {
        $request->user()->wishlist()->detach($productId);

        return response()->noContent();
    }
}
