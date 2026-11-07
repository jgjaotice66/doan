<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\StockReason;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdjustStockRequest;
use App\Http\Resources\AdminProductResource;
use App\Http\Resources\StockMovementResource;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Kho: xem tồn, nhập hàng / điều chỉnh, lịch sử biến động. Mọi thay đổi số tồn đi qua StockService.
 */
class InventoryController extends Controller
{
    /** Sắp xếp bảng tồn kho: [cột, chiều]; trùng giá trị thì xếp theo tên rồi id cho ổn định. */
    private const SORTS = [
        'stock_asc' => ['stock', 'asc'],
        'stock_desc' => ['stock', 'desc'],
        'name' => ['name', 'asc'],
        'newest' => ['created_at', 'desc'],
    ];

    public function __construct(private StockService $stock) {}

    /**
     * Sản phẩm (chưa xoá), mặc định tồn kho tăng dần — món sắp hết lên đầu (sort: stock_asc|stock_desc|name|newest). Kèm số món sắp hết / hết hàng.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'low_stock' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(array_keys(self::SORTS))],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        [$column, $direction] = self::SORTS[$validated['sort'] ?? 'stock_asc'];
        $threshold = (int) config('shop.low_stock_threshold');

        $products = Product::query()
            ->with(['category', 'brand', 'images' => fn ($query) => $query->limit(1)])
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->where(
                fn ($query) => $query->where('name', 'like', "%{$q}%")->orWhere('sku', 'like', "%{$q}%"),
            ))
            ->when($request->boolean('low_stock'), fn ($query) => $query->where('stock', '<=', $threshold))
            ->orderBy($column, $direction)
            ->orderBy('name')
            ->orderBy('id')
            ->paginate($validated['per_page'] ?? 10);

        return AdminProductResource::collection($products)->additional([
            'summary' => [
                'low_stock' => Product::where('stock', '<=', $threshold)->count(),
                'out_of_stock' => Product::where('stock', 0)->count(),
                'threshold' => $threshold,
            ],
        ]);
    }

    /**
     * Nhập hàng (+) hoặc điều chỉnh (+/−). Khoá dòng sản phẩm để 2 thao tác cùng lúc không lệch số; tồn âm → 422.
     */
    public function adjust(AdjustStockRequest $request, Product $product): JsonResponse
    {
        $quantity = (int) $request->validated('quantity');

        $movement = DB::transaction(function () use ($request, $product, $quantity) {
            $locked = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();

            if ($locked->stock + $quantity < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Tồn kho hiện có {$locked->stock}, không thể giảm ".abs($quantity).'.',
                ]);
            }

            return $this->stock->record($locked, $quantity, $request->reason(), user: $request->user(), note: $request->validated('note'));
        });

        return response()->json([
            'data' => [
                'product' => new AdminProductResource($product->refresh()->load(['category', 'brand', 'images'])),
                'movement' => new StockMovementResource($movement->load(['user', 'order'])),
            ],
        ], 201);
    }

    /**
     * Lịch sử kho (mặc định mới nhất trước, sort=oldest để đảo). Lọc: product (id), reason, from/to (tính cả 2 đầu).
     */
    public function movements(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'product' => ['nullable', 'integer'],
            'reason' => ['nullable', Rule::enum(StockReason::class)],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'sort' => ['nullable', Rule::in(['newest', 'oldest'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ], [
            'reason.enum' => 'Lý do không hợp lệ.',
            'to.after_or_equal' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.',
        ]);

        $movements = StockMovement::query()
            ->with(['product', 'order', 'user'])
            ->when($validated['product'] ?? null, fn ($query, $id) => $query->where('product_id', $id))
            ->when($validated['reason'] ?? null, fn ($query, $reason) => $query->where('reason', $reason))
            ->when($validated['from'] ?? null, fn ($query, $date) => $query->where('created_at', '>=', "{$date} 00:00:00"))
            ->when($validated['to'] ?? null, fn ($query, $date) => $query->where('created_at', '<=', "{$date} 23:59:59"))
            ->when(
                ($validated['sort'] ?? 'newest') === 'oldest',
                fn ($query) => $query->oldest()->orderBy('id'),
                fn ($query) => $query->latest()->orderByDesc('id'),
            )
            ->paginate($validated['per_page'] ?? 20);

        return StockMovementResource::collection($movements);
    }
}
