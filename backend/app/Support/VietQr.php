<?php

namespace App\Support;

use App\Models\Order;

/**
 * Tạo link ảnh QR chuyển khoản theo chuẩn VietQR (img.vietqr.io).
 * Quét bằng app ngân hàng sẽ tự điền số tiền + nội dung = mã đơn.
 */
class VietQr
{
    public static function url(Order $order): string
    {
        $bank = config('shop.vietqr.bank');
        $account = config('shop.vietqr.account');

        return "https://img.vietqr.io/image/{$bank}-{$account}-compact2.png?".http_build_query([
            'amount' => $order->total,
            'addInfo' => $order->code,
            'accountName' => config('shop.vietqr.account_name'),
        ]);
    }

    /**
     * Thông tin tài khoản để hiện cạnh mã QR (khách có thể chuyển tay).
     *
     * @return array{bank: string, account: string, account_name: string}
     */
    public static function bankInfo(): array
    {
        return [
            'bank' => (string) config('shop.vietqr.bank'),
            'account' => (string) config('shop.vietqr.account'),
            'account_name' => (string) config('shop.vietqr.account_name'),
        ];
    }
}
