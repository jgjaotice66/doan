<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Support\ShopSettings;
use Illuminate\Http\JsonResponse;

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
        ShopSettings::updateBankAccount($request->validated());

        return $this->response();
    }

    private function response(): JsonResponse
    {
        return response()->json([
            'data' => [
                ...ShopSettings::bankAccount(),
                'banks' => ShopSettings::banks(),
            ],
        ]);
    }
}
