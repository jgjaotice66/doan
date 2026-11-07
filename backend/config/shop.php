<?php

return [

    /*
    | Địa chỉ frontend React, dùng cho CORS.
    */
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    /*
    | Phí vận chuyển cố định cho mỗi đơn (VND).
    */
    'shipping_fee' => (int) env('SHIPPING_FEE', 30000),

    /*
    | Sản phẩm có tồn kho <= ngưỡng này được coi là sắp hết hàng.
    */
    'low_stock_threshold' => (int) env('LOW_STOCK_THRESHOLD', 5),

    /*
    | Thông tin tài khoản nhận chuyển khoản, dùng để tạo ảnh QR VietQR.
    | Mã ngân hàng xem tại https://api.vietqr.io/v2/banks
    */
    'vietqr' => [
        'bank' => env('VIETQR_BANK', 'MB'),
        'account' => env('VIETQR_ACCOUNT', ''),
        'account_name' => env('VIETQR_ACCOUNT_NAME', ''),
    ],

    /*
    | Ngân hàng admin chọn được ở "Cài đặt cửa hàng": mã VietQR => tên hiển thị.
    */
    'banks' => [
        'VCB' => 'Vietcombank',
        'ICB' => 'VietinBank',
        'BIDV' => 'BIDV',
        'VBA' => 'Agribank',
        'MB' => 'MB Bank',
        'TCB' => 'Techcombank',
        'ACB' => 'ACB',
        'VPB' => 'VPBank',
        'TPB' => 'TPBank',
        'STB' => 'Sacombank',
        'HDB' => 'HDBank',
        'VIB' => 'VIB',
        'SHB' => 'SHB',
        'MSB' => 'MSB',
        'OCB' => 'OCB',
        'SEAB' => 'SeABank',
        'LPB' => 'LPBank',
        'EIB' => 'Eximbank',
    ],

];
