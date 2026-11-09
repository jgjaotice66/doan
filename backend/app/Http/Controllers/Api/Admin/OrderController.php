<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateOrderStatusRequest;
use App\Http\Resources\AdminOrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Quản lý đơn của mọi khách: xem, chuyển trạng thái, xác nhận đã nhận tiền chuyển khoản.
 * Quy tắc nghiệp vụ nằm ở OrderService — dùng chung với phía khách.
 */
class OrderController extends Controller
{
    private const WITH = ['user', 'items.product.images', 'returnRequests.items.orderItem', 'returnRequests.media'];

    public function __construct(private OrderService $orders) {}

    /**
     * Lọc: status, payment_method, payment_status, awaiting_payment (chuyển khoản chưa trả, chưa huỷ), needs_refund (đã huỷ + đã trả), user (id khách), from/to (ngày đặt, tính cả 2 đầu), q = mã đơn / SĐT / tên người nhận.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'payment_method' => ['nullable', Rule::enum(PaymentMethod::class)],
            'payment_status' => ['nullable', Rule::enum(PaymentStatus::class)],
            'awaiting_payment' => ['nullable', 'boolean'],
            'needs_refund' => ['nullable', 'boolean'],
            'user' => ['nullable', 'integer'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ], [
            'to.after_or_equal' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.',
        ]);

        $orders = Order::query()
            ->with('user')
            ->withSum('items', 'quantity')
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->where(
                fn ($query) => $query->where('code', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('recipient_name', 'like', "%{$q}%"),
            ))
            ->when($validated['status'] ?? null, fn ($query, $value) => $query->where('status', $value))
            ->when($validated['payment_method'] ?? null, fn ($query, $value) => $query->where('payment_method', $value))
            ->when($validated['payment_status'] ?? null, fn ($query, $value) => $query->where('payment_status', $value))
            ->when($request->boolean('awaiting_payment'), fn ($query) => $query->awaitingTransfer())
            ->when($request->boolean('needs_refund'), fn ($query) => $query->needingRefund())
            ->when($validated['user'] ?? null, fn ($query, $id) => $query->where('user_id', $id))
            ->when($validated['from'] ?? null, fn ($query, $date) => $query->where('created_at', '>=', "{$date} 00:00:00"))
            ->when($validated['to'] ?? null, fn ($query, $date) => $query->where('created_at', '<=', "{$date} 23:59:59"))
            ->latest()
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 10);

        return AdminOrderResource::collection($orders);
    }

    public function show(Order $order): AdminOrderResource
    {
        return $this->resource($order);
    }

    /**
     * Chuyển sang trạng thái kế tiếp; huỷ thì hoàn kho. Sai luồng → 422.
     */
    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): AdminOrderResource
    {
        $this->orders->changeStatus($order, $request->status(), $request->user());

        return $this->resource($order);
    }

    /**
     * Nút "Đã nhận tiền": chỉ cho đơn chuyển khoản chưa trả, chưa huỷ.
     */
    public function markPaid(Order $order): AdminOrderResource
    {
        $this->orders->markPaid($order);

        return $this->resource($order);
    }

    /**
     * Nút "Đã hoàn tiền": chỉ cho đơn đã huỷ mà khách đã thanh toán.
     */
    public function markRefunded(Order $order): AdminOrderResource
    {
        $this->orders->markRefunded($order);

        return $this->resource($order);
    }

    private function resource(Order $order): AdminOrderResource
    {
        return new AdminOrderResource($order->load(self::WITH));
    }
}
