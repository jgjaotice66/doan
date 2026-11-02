# 31 – Kho / tồn kho
**Mục tiêu:** Nhập hàng, điều chỉnh tồn, xem lịch sử biến động.
**Phụ thuộc:** 28
**File tạo/sửa:** `app/Http/Controllers/Api/Admin/InventoryController.php`, `tests/Feature/Admin/InventoryTest.php`, `src/pages/admin/InventoryPage.jsx`

## Các bước
1. `GET admin/inventory` (sản phẩm + tồn; lọc `low_stock`), có tổng số sản phẩm sắp hết.
2. `POST admin/inventory/{product}/adjust` {type: import|adjust, quantity (+/-), note} qua `StockService`; không cho tồn âm.
3. `GET admin/inventory/movements` (lọc sản phẩm, lý do, ngày).
4. Giao diện: tab "Tồn kho" (cảnh báo đỏ) và "Lịch sử"; Modal nhập/điều chỉnh.

## Tiêu chí hoàn thành
- Test pass: nhập +10 ghi movement đúng; điều chỉnh làm tồn âm → 422.
