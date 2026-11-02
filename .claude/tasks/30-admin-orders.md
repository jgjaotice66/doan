# 30 – Admin: quản lý đơn hàng
**Mục tiêu:** Admin xử lý đơn và xác nhận thanh toán QR.
**Phụ thuộc:** 21, 26
**File tạo/sửa:** `app/Http/Controllers/Api/Admin/OrderController.php`, `tests/Feature/Admin/OrderManageTest.php`, `src/pages/admin/OrdersPage.jsx`, `src/pages/admin/OrderDetailPage.jsx`

## Các bước
1. `GET admin/orders` (lọc status, payment_method, payment_status, khoảng ngày, q = mã/sđt/tên).
2. `GET admin/orders/{id}`; `PATCH admin/orders/{id}/status` dùng lại `OrderService::changeStatus`.
3. `PATCH admin/orders/{id}/payment` → đánh dấu paid (chỉ cho đơn bank_qr chưa huỷ).
4. Giao diện: bảng đơn, trang chi tiết với nút chuyển trạng thái hợp lệ tiếp theo, nút "Đã nhận tiền".

## Tiêu chí hoàn thành
- Test pass: admin huỷ đơn confirmed → hoàn kho; xác nhận thanh toán đơn COD → 422.
- Thao tác trên UI phản ánh ngay ở trang "Đơn của tôi" của khách.
