<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ProductStatus;
use App\Enums\StockReason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\AdminProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Services\ProductImageService;
use App\Services\StockService;
use App\Support\Slug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Quản trị sản phẩm (gồm cả sản phẩm ẩn). Xoá = xoá mềm để đơn cũ vẫn tham chiếu được.
 */
class ProductController extends Controller
{
    private const SORTS = [
        'newest' => ['created_at', 'desc'],
        'name' => ['name', 'asc'],
        'price_asc' => ['price', 'asc'],
        'price_desc' => ['price', 'desc'],
        'stock_asc' => ['stock', 'asc'],
    ];

    public function __construct(
        private StockService $stock,
        private ProductImageService $images,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'integer'],
            'brand' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::enum(ProductStatus::class)],
            'low_stock' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(array_keys(self::SORTS))],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        [$column, $direction] = self::SORTS[$validated['sort'] ?? 'newest'];

        $products = Product::query()
            ->with(['category', 'brand', 'images' => fn ($query) => $query->limit(1)])
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->where(
                fn ($query) => $query->where('name', 'like', "%{$q}%")->orWhere('sku', 'like', "%{$q}%"),
            ))
            // Danh mục gốc → gồm cả các danh mục con của nó.
            ->when($validated['category'] ?? null, fn ($query, $id) => $query->whereIn(
                'category_id', Category::query()->whereKey($id)->orWhere('parent_id', $id)->select('id'),
            ))
            ->when($validated['brand'] ?? null, fn ($query, $id) => $query->where('brand_id', $id))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($request->boolean('low_stock'), fn ($query) => $query->where('stock', '<=', config('shop.low_stock_threshold')))
            ->orderBy($column, $direction)
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 10);

        return AdminProductResource::collection($products);
    }

    /**
     * Tạo sản phẩm: tồn kho ban đầu ghi thành 1 dòng "Nhập kho"; ảnh (nếu có) xếp theo thứ tự gửi lên.
     */
    public function store(ProductRequest $request): JsonResponse
    {
        $data = $request->validated();

        $product = DB::transaction(function () use ($request, $data) {
            $product = Product::create([
                ...Arr::except($data, ['stock', 'images']),
                'slug' => Slug::unique(Product::class, $data['name']),
                'is_featured' => $request->boolean('is_featured'),
                'stock' => 0,
            ]);

            if ($data['stock'] > 0) {
                $this->stock->record($product, $data['stock'], StockReason::Import, user: $request->user(), note: 'Tồn kho ban đầu');
            }

            if ($request->hasFile('images')) {
                $this->images->attach($product, $request->file('images'));
            }

            return $product;
        });

        return $this->resource($product)->response()->setStatusCode(201);
    }

    public function show(Product $product): AdminProductResource
    {
        return $this->resource($product);
    }

    /**
     * Sửa thông tin (không gồm tồn kho và ảnh — có màn/API riêng). Đổi tên thì slug đổi theo.
     */
    public function update(ProductRequest $request, Product $product): AdminProductResource
    {
        $data = $request->validated();

        $product->update([
            ...$data,
            'slug' => $data['name'] === $product->name ? $product->slug : Slug::unique(Product::class, $data['name'], $product->id),
            'is_featured' => $request->boolean('is_featured'),
            'sale_price' => $data['sale_price'] ?? null,
            'description' => $data['description'] ?? null,
        ]);

        return $this->resource($product);
    }

    /**
     * Xoá mềm: ẩn khỏi cửa hàng và admin, đơn hàng/lịch sử kho cũ vẫn giữ liên kết. Ảnh giữ lại.
     */
    public function destroy(Product $product): Response
    {
        $product->delete();

        return response()->noContent();
    }

    private function resource(Product $product): AdminProductResource
    {
        return new AdminProductResource($product->load(['category', 'brand', 'images']));
    }
}
