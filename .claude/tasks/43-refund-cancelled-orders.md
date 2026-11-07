# 43 – Hoàn tiền cho đơn huỷ đã thanh toán — task phụ
**Mục tiêu:** Đơn đã nhận tiền mà bị huỷ thì không "mất dấu": khách không tự huỷ được nữa, admin có danh sách cần hoàn và nút "Đã hoàn tiền".
**Phụ thuộc:** 30 (làm sau 42)
**File tạo/sửa:** `app/Enums/PaymentStatus.php` (+ `refunded`), `app/Services/OrderService.php` (`cancelByCustomer`, `markRefunded`), `app/Http/Controllers/Api/Admin/OrderController.php`, `app/Http/Resources/AdminOrderResource.php` (`can_mark_refunded`), `routes/api.php`, `tests/Feature/Admin/OrderManageTest.php`, `tests/Feature/OrderStatusTest.php`; frontend `src/features/admin/orders.js`, `src/pages/admin/OrdersPage.jsx`, `src/pages/admin/OrderDetailPage.jsx`, `src/pages/store/OrderDetailPage.jsx`.

## Các bước
1. (TDD) Test:
   - Khách huỷ đơn pending **đã thanh toán** → 422 "Đơn đã thanh toán, vui lòng liên hệ cửa hàng để huỷ."; đơn chưa trả vẫn huỷ được như cũ.
   - `PATCH admin/orders/{id}/refund`: chỉ cho đơn **đã huỷ + đã thanh toán** → `payment_status = refunded`; đơn khác → 422; customer → 403.
   - Bộ lọc `needs_refund=1` (đã huỷ + paid) ở `GET admin/orders`.
2. Thêm `PaymentStatus::Refunded` (nhãn "Đã hoàn tiền"); `OrderService::markRefunded` khoá dòng như `markPaid`.
3. Admin: nút "Cần hoàn tiền" trên bảng đơn (giống "Chờ xác nhận tiền"); trang chi tiết đơn huỷ + đã trả có cảnh báo + nút **"Đã hoàn tiền"** (hộp xác nhận ghi số tiền).
4. Storefront: đơn đã thanh toán ẩn nút huỷ, hiện "Muốn huỷ đơn đã thanh toán? Vui lòng liên hệ cửa hàng."; đơn huỷ có tag "Đã hoàn tiền" khi xong.
5. Hoàn tiền làm thủ công (admin tự chuyển khoản trả rồi bấm nút) — cùng nguyên tắc với "Đã nhận tiền".

## Tiêu chí hoàn thành
- `php artisan test --compact` đạt.
- Admin "Đã nhận tiền" một đơn pending → khách không còn nút huỷ; admin huỷ → đơn hiện trong "Cần hoàn tiền" → bấm "Đã hoàn tiền" → khách thấy "Đã hoàn tiền".
