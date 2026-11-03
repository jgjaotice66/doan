<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductIndexRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Queries\ProductFilter;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    public function index(ProductIndexRequest $request): AnonymousResourceCollection
    {
        $query = Product::query()
            ->active()
            ->with(['brand', 'images' => fn ($q) => $q->limit(1)]);

        $products = ProductFilter::apply($query, $request->validated())
            ->paginate($request->perPage())
            ->withQueryString();

        return ProductResource::collection($products);
    }
}
