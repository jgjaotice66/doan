# 21 – Huỷ đơn & chuyển trạng thái
**Mục tiêu:** Quy tắc trạng thái đơn tập trung một chỗ, huỷ thì hoàn kho.
**Phụ thuộc:** 20
**File tạo/sửa:** `app/Enums/OrderStatus.php` (hàm `canTransitionTo`), `app/Services/OrderService.php`, `tests/Feature/OrderStatusTest.php`

## Các bước (TDD)
1. Luồng hợp lệ: pending → confirmed → shipping → completed; pending|confirmed → cancelled.
2. `OrderService::changeStatus(order, status, actor)`: kiểm tra hợp lệ (không → 422); cancelled → `StockService::increase()` reason=cancel; completed + COD → `payment_status=paid`.
3. `POST orders/{code}/cancel` cho khách: chỉ khi pending.
4. Hàm này sẽ được admin dùng lại ở task 30.

## Tiêu chí hoàn thành
- Test pass: khách huỷ pending → hoàn kho đúng số lượng; khách huỷ confirmed → 422; chuyển sai luồng (pending → completed) → 422; COD completed tự paid.
