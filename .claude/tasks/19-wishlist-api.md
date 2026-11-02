# 19 – API yêu thích
**Mục tiêu:** Lưu/bỏ sản phẩm yêu thích.
**Phụ thuộc:** 06, 12
**File tạo/sửa:** `app/Http/Controllers/Api/WishlistController.php`, `tests/Feature/WishlistTest.php`

## Các bước
1. `GET wishlist` → danh sách sản phẩm (dùng ProductResource).
2. `POST wishlist` {product_id} (idempotent, không tạo trùng); `DELETE wishlist/{productId}`.

## Tiêu chí hoàn thành
- Test pass: thêm 2 lần chỉ 1 bản ghi; xoá đúng; chưa đăng nhập 401.
