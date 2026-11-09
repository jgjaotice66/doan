<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\PlaceOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Đơn hàng của khách đang đăng nhập.
 */
class OrderController extends Controller
{
    /** Quan hệ cần cho OrderResource (ảnh đại diện của từng sản phẩm trong đơn). */
    private const WITH = ['items.product.images'];

    /** Trang chi tiết: thêm yêu cầu trả hàng (khách xem tiến độ, hạn trả, số lượng còn trả được). */
    public const DETAIL_WITH = [...self::WITH, 'returnRequests.items.orderItem', 'returnRequests.media'];

    public function __construct(private OrderService $orders) {}

    /**
     * Danh sách đơn của tôi, lọc tuỳ chọn theo ?status= (tab trên trang "Đơn hàng của tôi").
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
        ]);

        $orders = $request->user()->orders()
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->with(self::WITH)
            ->latest()
            ->orderByDesc('id')
            ->paginate(10);

        return OrderResource::collection($orders);
    }

    public function store(PlaceOrderRequest $request): JsonResponse
    {
        $order = $this->orders->place($request->user(), $request->validated());

        return (new OrderResource($order->load(self::DETAIL_WITH)))->response()->setStatusCode(201);
    }

    public function show(Request $request, string $code): OrderResource
    {
        return new OrderResource($this->findOwnOrder($request, $code)->load(self::DETAIL_WITH));
    }

    /**
     * Khách tự huỷ đơn đang chờ xác nhận; kho được hoàn lại.
     */
    public function cancel(Request $request, string $code): OrderResource
    {
        $order = $this->orders->cancelByCustomer($this->findOwnOrder($request, $code), $request->user());

        return new OrderResource($order->load(self::DETAIL_WITH));
    }

    /**
     * Chỉ tìm trong đơn của chính mình → đơn người khác trả 404.
     */
    private function findOwnOrder(Request $request, string $code): Order
    {
        return $request->user()->orders()->where('code', $code)->firstOrFail();
    }
}
