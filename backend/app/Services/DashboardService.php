<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\ReturnStatus;
use App\Enums\UserRole;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\User;
use App\Support\Media;
use App\Support\ShopSettings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Số liệu trang tổng quan admin.
 *
 * Quy ước doanh thu: tổng `total` của đơn ĐÃ HOÀN THÀNH và ĐÃ THU TIỀN (Order::countedAsRevenue),
 * tính vào ngày hoàn thành (completed_at), TRỪ tiền hoàn của yêu cầu trả hàng vào ngày hoàn tiền (refunded_at)
 * — số của kỳ trước không bị sửa ngược. "Hôm nay", "tháng này" theo giờ cửa hàng (config shop.timezone),
 * còn DB lưu giờ ứng dụng (UTC) → mốc thời gian phải đổi múi giờ trước khi so sánh.
 */
class DashboardService
{
    public const RANGES = ['30d', '12m'];

    /**
     * @return array<string, int|null>
     */
    public function summary(): array
    {
        $now = $this->now();
        $todayStart = $now->copy()->startOfDay();
        $monthStart = $now->copy()->startOfMonth();
        // Cùng kỳ tháng trước: từ đầu tháng trước tới đúng thời điểm này của tháng trước.
        $lastMonthStart = $monthStart->copy()->subMonthNoOverflow();
        $lastMonthNow = $now->copy()->subMonthNoOverflow();

        $revenueMonth = $this->revenueBetween($monthStart, $now);
        $revenueLastMonth = $this->revenueBetween($lastMonthStart, $lastMonthNow);
        $threshold = ShopSettings::lowStockThreshold();

        return [
            'revenue_today' => $this->revenueBetween($todayStart, $now),
            'revenue_month' => $revenueMonth,
            'revenue_last_month_same_period' => $revenueLastMonth,
            // % tăng/giảm so với cùng kỳ; tháng trước không có doanh thu thì không so được → null.
            'revenue_month_change' => $revenueLastMonth > 0
                ? (int) round(($revenueMonth - $revenueLastMonth) / $revenueLastMonth * 100)
                : null,
            'orders_today' => Order::where('created_at', '>=', $this->toDb($todayStart))->count(),
            'pending_orders' => Order::where('status', OrderStatus::Pending)->count(),
            'awaiting_payment' => Order::awaitingTransfer()->count(),
            'needs_refund' => Order::needingRefund()->count(),
            'pending_returns' => ReturnRequest::where('status', ReturnStatus::Pending)->count(),
            'new_customers_month' => User::where('role', UserRole::Customer)->where('created_at', '>=', $this->toDb($monthStart))->count(),
            // Theo ngưỡng thực tế từng sản phẩm (riêng → danh mục → chung); low_stock_threshold = ngưỡng chung.
            'low_stock' => Product::lowStock()->count(),
            'out_of_stock' => Product::where('stock', 0)->count(),
            'low_stock_threshold' => $threshold,
        ];
    }

    /**
     * Doanh thu theo ngày (30d) hoặc theo tháng (12m). Ngày/tháng không có đơn vẫn có điểm, giá trị 0.
     *
     * @return array{range: string, points: list<array{date: string, label: string, revenue: int, orders: int}>, total_revenue: int, total_orders: int}
     */
    public function revenue(string $range): array
    {
        $now = $this->now();
        [$start, $count, $step, $keyFormat] = $range === '12m'
            ? [$now->copy()->startOfMonth()->subMonthsNoOverflow(11), 12, 'addMonthNoOverflow', 'Y-m']
            : [$now->copy()->startOfDay()->subDays(29), 30, 'addDay', 'Y-m-d'];

        // Khung đủ mọi ngày/tháng trong khoảng, mặc định 0.
        $points = [];
        $cursor = $start->copy();
        for ($i = 0; $i < $count; $i++) {
            $points[$cursor->format($keyFormat)] = [
                'date' => $cursor->format($keyFormat),
                'label' => $range === '12m' ? 'T'.$cursor->format('n/Y') : $cursor->format('d/m'),
                'revenue' => 0,
                'orders' => 0,
            ];
            $cursor->{$step}();
        }

        // Gom theo ngày giờ VN ở PHP (không phụ thuộc hàm múi giờ của MySQL).
        $orders = Order::countedAsRevenue()
            ->where('completed_at', '>=', $this->toDb($start))
            ->where('completed_at', '<=', $this->toDb($now))
            ->get(['completed_at', 'total']);

        foreach ($orders as $order) {
            $key = $order->completed_at->copy()->setTimezone($this->timezone())->format($keyFormat);
            if (isset($points[$key])) {
                $points[$key]['revenue'] += $order->total;
                $points[$key]['orders']++;
            }
        }

        // Tiền hoàn của yêu cầu trả hàng trừ vào ngày hoàn tiền (ngày đó có thể âm).
        foreach ($this->refundsQuery($start, $now)->get(['refunded_at', 'refund_amount']) as $refund) {
            $key = $refund->refunded_at->copy()->setTimezone($this->timezone())->format($keyFormat);
            if (isset($points[$key])) {
                $points[$key]['revenue'] -= $refund->refund_amount;
            }
        }

        return [
            'range' => $range,
            'points' => array_values($points),
            'total_revenue' => array_sum(array_column($points, 'revenue')),
            'total_orders' => $orders->count(),
        ];
    }

    /**
     * Sản phẩm bán chạy theo số lượng (chỉ đơn được tính doanh thu), kèm doanh thu từng sản phẩm.
     *
     * @return list<array<string, mixed>>
     */
    public function topProducts(int $limit): array
    {
        $rows = OrderItem::query()
            ->whereIn('order_items.order_id', Order::countedAsRevenue()->select('orders.id'))
            ->groupBy('order_items.product_id')
            ->selectRaw('order_items.product_id, MAX(order_items.product_name) as product_name')
            ->selectRaw('SUM(order_items.quantity) as quantity, SUM(order_items.price * order_items.quantity) as revenue')
            ->orderByDesc('quantity')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get();

        // Sản phẩm có thể đã bị xoá mềm → vẫn lấy để hiện tên/ảnh hiện tại; mất hẳn thì dùng tên lưu trong đơn.
        $products = Product::withTrashed()
            ->with(['images' => fn ($q) => $q->orderBy('sort_order')])
            ->findMany($rows->pluck('product_id'))
            ->keyBy('id');

        return $rows->map(function ($row) use ($products) {
            $product = $products->get($row->product_id);

            return [
                'product_id' => (int) $row->product_id,
                'name' => $product->name ?? $row->product_name,
                'sku' => $product?->sku,
                'slug' => $product?->slug,
                'thumbnail' => Media::url($product?->images->first()?->path),
                'quantity' => (int) $row->quantity,
                'revenue' => (int) $row->revenue,
            ];
        })->all();
    }

    /**
     * Số đơn ở từng trạng thái (đủ mọi trạng thái, kể cả 0) — cho biểu đồ tròn.
     *
     * @return list<array{value: string, label: string, count: int}>
     */
    public function orderStatus(): array
    {
        $counts = Order::query()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        return array_map(fn (OrderStatus $status) => [
            'value' => $status->value,
            'label' => $status->label(),
            'count' => (int) ($counts[$status->value] ?? 0),
        ], OrderStatus::cases());
    }

    /** Doanh thu thuần trong khoảng = tiền đơn hoàn thành − tiền hoàn trả hàng (theo ngày hoàn tiền). */
    private function revenueBetween(Carbon $from, Carbon $to): int
    {
        $sales = (int) Order::countedAsRevenue()
            ->where('completed_at', '>=', $this->toDb($from))
            ->where('completed_at', '<=', $this->toDb($to))
            ->sum('total');

        return $sales - (int) $this->refundsQuery($from, $to)->sum('refund_amount');
    }

    /**
     * @return Builder<ReturnRequest>
     */
    private function refundsQuery(Carbon $from, Carbon $to): Builder
    {
        return ReturnRequest::where('status', ReturnStatus::Refunded)
            ->where('refunded_at', '>=', $this->toDb($from))
            ->where('refunded_at', '<=', $this->toDb($to));
    }

    private function timezone(): string
    {
        return config('shop.timezone');
    }

    private function now(): Carbon
    {
        return now()->setTimezone($this->timezone());
    }

    /** Mốc giờ cửa hàng → giờ ứng dụng (cách DB đang lưu). */
    private function toDb(Carbon $time): Carbon
    {
        return $time->copy()->setTimezone(config('app.timezone'));
    }
}
