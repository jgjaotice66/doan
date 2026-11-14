<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ProductStatus;
use App\Enums\StockReason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ContentImageRequest;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\AdminProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Services\ProductImageService;
use App\Services\StockService;
use App\Support\Media;
use App\Support\ProductContent;
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
            // out = hết hàng (tồn 0); low = sắp hết (còn hàng nhưng ≤ ngưỡng).
            'stock' => ['nullable', Rule::in(['out', 'low'])],
            'sort' => ['nullable', Rule::in(array_keys(self::SORTS))],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        [$column, $direction] = self::SORTS[$validated['sort'] ?? 'newest'];

        $products = Product::query()
            ->with(['category.parent', 'brand', 'images' => fn ($query) => $query->limit(1)])
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->where(
                fn ($query) => $query->where('name', 'like', "%{$q}%")->orWhere('sku', 'like', "%{$q}%"),
            ))
            // Danh mục gốc → gồm cả các danh mục con của nó.
            ->when($validated['category'] ?? null, fn ($query, $id) => $query->whereIn(
                'category_id', Category::query()->whereKey($id)->orWhere('parent_id', $id)->select('id'),
            ))
            ->when($validated['brand'] ?? null, fn ($query, $id) => $query->where('brand_id', $id))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($request->boolean('low_stock'), fn ($query) => $query->lowStock())
            ->when(($validated['stock'] ?? null) === 'out', fn ($query) => $query->where('stock', 0))
            ->when(($validated['stock'] ?? null) === 'low', fn ($query) => $query->lowStock()->where('stock', '>', 0))
            ->orderBy($column, $direction)
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 10);

        // Số cần nhập hàng của cả cửa hàng (không theo bộ lọc) → thông báo đầu trang Sản phẩm.
        return AdminProductResource::collection($products)->additional(['meta' => [
            'stock_alerts' => [
                'out_of_stock' => Product::where('stock', 0)->count(),
                'low_stock' => Product::lowStock()->where('stock', '>', 0)->count(),
            ],
        ]]);
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
                'description' => ProductContent::normalize($data['description'] ?? null),
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
     * Ảnh chèn trong mô tả mà bị bỏ khỏi nội dung thì xoá luôn file.
     */
    public function update(ProductRequest $request, Product $product): AdminProductResource
    {
        $data = $request->validated();
        $before = $product->description;

        $product->update([
            ...$data,
            'slug' => $data['name'] === $product->name ? $product->slug : Slug::unique(Product::class, $data['name'], $product->id),
            'is_featured' => $request->boolean('is_featured'),
            'sale_price' => $data['sale_price'] ?? null,
            'description' => ProductContent::normalize($data['description'] ?? null),
        ]);

        ProductContent::deleteUnusedImages($before, $product->description);

        return $this->resource($product);
    }

    /**
     * Ảnh chèn trong mô tả (nút ảnh / kéo-thả / dán của trình soạn thảo) → trả URL để chèn vào nội dung.
     */
    public function uploadContentImage(ContentImageRequest $request): JsonResponse
    {
        $path = Media::store($request->file('image'), ProductContent::IMAGE_DIR);

        return response()->json(['url' => Media::url($path)], 201);
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
        return new AdminProductResource($product->load(['category.parent', 'brand', 'images']));
    }
}
