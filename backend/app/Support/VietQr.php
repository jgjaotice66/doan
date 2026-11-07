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
        ['bank' => $bank, 'account' => $account, 'account_name' => $accountName] = self::bankInfo();

        return "https://img.vietqr.io/image/{$bank}-{$account}-compact2.png?".http_build_query([
            'amount' => $order->total,
            'addInfo' => $order->code,
            'accountName' => $accountName,
        ]);
    }

    /**
     * Thông tin tài khoản để hiện cạnh mã QR (khách có thể chuyển tay).
     * Admin sửa ở "Cài đặt cửa hàng"; chưa sửa thì lấy từ .env.
     *
     * @return array{bank: string, bank_name: string, account: string, account_name: string}
     */
    public static function bankInfo(): array
    {
        $info = ShopSettings::bankAccount();

        return [...$info, 'bank_name' => config("shop.banks.{$info['bank']}", $info['bank'])];
    }
}
