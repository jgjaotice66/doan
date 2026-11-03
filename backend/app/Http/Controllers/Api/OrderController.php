<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PlaceOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Đơn hàng của khách đang đăng nhập.
 */
class OrderController extends Controller
{
    /** Quan hệ cần cho OrderResource (ảnh đại diện của từng sản phẩm trong đơn). */
    private const WITH = ['items.product.images'];

    public function __construct(private OrderService $orders) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = $request->user()->orders()
            ->with(self::WITH)
            ->latest()
            ->orderByDesc('id')
            ->paginate(10);

        return OrderResource::collection($orders);
    }

    public function store(PlaceOrderRequest $request): JsonResponse
    {
        $order = $this->orders->place($request->user(), $request->validated());

        return (new OrderResource($order->load(self::WITH)))->response()->setStatusCode(201);
    }

    /**
     * Chỉ tìm trong đơn của chính mình → đơn người khác trả 404.
     */
    public function show(Request $request, string $code): OrderResource
    {
        /** @var Order $order */
        $order = $request->user()->orders()->where('code', $code)->with(self::WITH)->firstOrFail();

        return new OrderResource($order);
    }
}
