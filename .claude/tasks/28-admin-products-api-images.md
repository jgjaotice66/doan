# 28 – Admin: API sản phẩm + ảnh
**Mục tiêu:** Quản trị viên quản lý sản phẩm và nhiều ảnh.
**Phụ thuộc:** 27
**File tạo/sửa:** `app/Http/Controllers/Api/Admin/ProductController.php`, `ProductImageController.php`, `app/Http/Requests/Admin/ProductRequest.php`, `tests/Feature/Admin/ProductTest.php`

## Các bước (TDD)
1. `GET admin/products` (cả sản phẩm ẩn; lọc q, category, brand, status, low_stock).
2. `POST/PUT/DELETE admin/products` (xoá mềm); validate sale_price < price, sku unique, min_age thuộc tập cho phép.
3. Tồn kho ban đầu khi tạo ghi stock_movements(reason=import). Khi sửa sản phẩm KHÔNG cho sửa stock trực tiếp (dùng màn Kho – task 31).
4. Ảnh: `POST admin/products/{id}/images` (nhiều file), `DELETE admin/product-images/{id}` (xoá cả file), `PUT admin/products/{id}/images/order` (sắp xếp).

## Tiêu chí hoàn thành
- Test pass: tạo kèm stock ghi movement, sale_price ≥ price bị 422, upload/xoá ảnh xoá cả file trong storage (`Storage::fake`).
