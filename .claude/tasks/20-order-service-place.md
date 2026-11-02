# 20 – Đặt hàng (OrderService + kho)
**Mục tiêu:** Tạo đơn từ giỏ an toàn, trừ kho chính xác.
**Phụ thuộc:** 18
**File tạo/sửa:** `app/Services/OrderService.php`, `app/Services/StockService.php`, `app/Http/Controllers/Api/OrderController.php`, `app/Http/Requests/PlaceOrderRequest.php`, `app/Http/Resources/OrderResource.php`, `tests/Feature/PlaceOrderTest.php`

## Các bước (TDD)
1. `POST orders` {recipient_name, phone (định dạng VN), address, note?, payment_method: cod|bank_qr}.
2. `OrderService::place(User, data)` trong `DB::transaction`:
   - `lockForUpdate` sản phẩm trong giỏ; giỏ rỗng → 422.
   - Sản phẩm ẩn/không đủ kho → 422 kèm danh sách lỗi.
   - Tạo order (code dạng `TS` + yyMMdd + 4 ký tự ngẫu nhiên) + order_items (snapshot tên/giá).
   - `StockService::decrease()` trừ kho + ghi stock_movements(reason=order).
   - Xoá giỏ.
3. Trả OrderResource; nếu `bank_qr` kèm `qr_url` VietQR (amount = total, addInfo = code).
4. `GET orders` (phân trang, của chính user), `GET orders/{code}` (của người khác → 404).

## Tiêu chí hoàn thành
- Test pass: đặt thành công trừ kho + có stock_movement; không đủ kho thì không tạo đơn, kho giữ nguyên; giỏ rỗng 422; giá trong order_items không đổi khi sửa giá sản phẩm sau đó; qr_url đúng số tiền và mã đơn.
