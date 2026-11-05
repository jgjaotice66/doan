# 42 – Cài đặt cửa hàng (tài khoản nhận tiền) — task phụ
**Mục tiêu:** Admin tự sửa thông tin chuyển khoản (ngân hàng, số TK, chủ TK) mà không cần sửa `.env`; QR của đơn chưa thanh toán đổi theo ngay.
**Phụ thuộc:** 26, 23 (làm sau 30)
**File tạo/sửa:** migration `settings` (key, value), `app/Models/Setting.php`, `app/Support/VietQr.php`, `app/Http/Controllers/Api/Admin/SettingController.php`, `app/Http/Requests/Admin/UpdateSettingsRequest.php`, `routes/api.php`, `tests/Feature/Admin/SettingTest.php`; frontend `src/api/admin/settings.js`, `src/pages/admin/SettingsPage.jsx`, menu admin.

## Các bước
1. (TDD) Test: admin GET/PUT `/api/v1/admin/settings`; customer → 403; validate (bank bắt buộc, số TK chỉ gồm số 6–20 ký tự, chủ TK in hoa không dấu).
2. Bảng `settings` dạng key/value + cache; `VietQr` đọc từ settings trước, chưa có thì lấy `config('shop.vietqr.*')` (.env).
3. Trang admin "Cài đặt cửa hàng": form Ant Design + ảnh QR xem trước (số tiền mẫu).
4. Nguyên tắc thanh toán (giữ nguyên): đơn `bank_qr` luôn **Chưa thanh toán** cho tới khi admin bấm "Đã nhận tiền" (task 30) → mới thành **Đã thanh toán**; storefront chỉ hiện "Thanh toán thành công" khi `payment_status = paid`.

## Tiêu chí hoàn thành
- `php artisan test --compact` đạt; đổi số TK trong admin → mở trang đơn chưa thanh toán thấy QR/số TK mới; customer gọi API → 403.
