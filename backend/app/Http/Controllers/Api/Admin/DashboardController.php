<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Số liệu trang tổng quan admin (xem quy ước doanh thu trong DashboardService).
 */
class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboard) {}

    public function summary(): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->summary()]);
    }

    /**
     * range=30d (theo ngày, mặc định) | 12m (theo tháng).
     */
    public function revenue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'range' => ['nullable', Rule::in(DashboardService::RANGES)],
        ], [
            'range.in' => 'Khoảng thời gian chỉ nhận 30d hoặc 12m.',
        ]);

        return response()->json(['data' => $this->dashboard->revenue($validated['range'] ?? '30d')]);
    }

    public function topProducts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        return response()->json(['data' => $this->dashboard->topProducts($validated['limit'] ?? 10)]);
    }

    public function orderStatus(): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->orderStatus()]);
    }
}
