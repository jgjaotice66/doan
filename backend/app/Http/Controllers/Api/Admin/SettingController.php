<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Support\ShopSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Cài đặt cửa hàng: tài khoản nhận chuyển khoản (dùng cho QR của mọi đơn chưa thanh toán).
 */
class SettingController extends Controller
{
    public function show(): JsonResponse
    {
        return $this->response();
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        ShopSettings::updateBankAccount($request->safe()->only(['bank', 'account', 'account_name']));
        if ($request->has('low_stock_threshold')) {
            ShopSettings::updateLowStockThreshold((int) $request->validated('low_stock_threshold'));
        }

        return $this->response();
    }

    /**
     * Chỉ sửa ngưỡng "sắp hết hàng" chung (thẻ Kho hàng) — không cần gửi kèm tài khoản ngân hàng.
     */
    public function updateLowStock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'low_stock_threshold' => ['required', 'integer', 'min:0', 'max:1000'],
        ], [
            'low_stock_threshold.required' => 'Vui lòng nhập ngưỡng sắp hết hàng.',
            'low_stock_threshold.integer' => 'Ngưỡng phải là số nguyên.',
            'low_stock_threshold.min' => 'Ngưỡng không được âm.',
            'low_stock_threshold.max' => 'Ngưỡng tối đa 1000.',
        ]);

        ShopSettings::updateLowStockThreshold($validated['low_stock_threshold']);

        return $this->response();
    }

    /**
     * Số hotline cho nút gọi nổi trên storefront. Bỏ khoảng trắng, dấu chấm, gạch ngang trước khi kiểm tra;
     * gửi rỗng / null để ẩn nút.
     */
    public function updateHotline(Request $request): JsonResponse
    {
        $hotline = $request->input('hotline');
        $request->merge(['hotline' => is_string($hotline) ? (preg_replace('/[\s.\-]/', '', $hotline) ?: null) : $hotline]);

        $validated = $request->validate([
            'hotline' => ['present', 'nullable', 'string', 'regex:/^(0\d{9,10}|1[89]00\d{4,6})$/'],
        ], [
            'hotline.regex' => 'Số hotline không hợp lệ. Nhập số bắt đầu bằng 0 (10–11 số) hoặc tổng đài 1800/1900.',
        ]);

        ShopSettings::updateHotline($validated['hotline']);

        return $this->response();
    }

    private function response(): JsonResponse
    {
        return response()->json([
            'data' => [
                ...ShopSettings::bankAccount(),
                'hotline' => ShopSettings::hotline(),
                'low_stock_threshold' => ShopSettings::lowStockThreshold(),
                'banks' => ShopSettings::banks(),
            ],
        ]);
    }
}
