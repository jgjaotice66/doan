# 18 – API giỏ hàng
**Mục tiêu:** Giỏ hàng lưu trên server theo user.
**Phụ thuộc:** 06, 12
**File tạo/sửa:** `app/Http/Controllers/Api/CartController.php`, `app/Http/Requests/Cart/*`, `app/Http/Resources/CartItemResource.php`, `tests/Feature/CartTest.php`

## Các bước (TDD)
1. `GET cart` → items (kèm sản phẩm, final_price, line_total), `subtotal`, `shipping_fee`, `total`, `count`.
2. `POST cart` {product_id, quantity}: đã có thì cộng dồn; vượt tồn kho → 422.
3. `PATCH cart/{id}` {quantity}; `DELETE cart/{id}`. Chỉ thao tác được item của chính mình (khác → 404/403).
4. Sản phẩm bị ẩn/hết hàng vẫn hiện trong giỏ nhưng có cờ `unavailable`.

## Tiêu chí hoàn thành
- Test pass: thêm mới, cộng dồn, vượt tồn kho, sửa/xoá item của người khác bị chặn, tính tổng đúng.
