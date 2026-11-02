# 13 – API chi tiết sản phẩm
**Mục tiêu:** `GET products/{slug}` trả đủ thông tin cho trang chi tiết.
**Phụ thuộc:** 12
**File tạo/sửa:** `ProductController@show`, `app/Http/Resources/ProductDetailResource.php`, `tests/Feature/ProductDetailTest.php`

## Các bước
1. Trả: thông tin đầy đủ, mảng ảnh (theo sort_order), category, brand, stock, min_age, `is_wishlisted` (nếu có token).
2. Kèm `related`: tối đa 8 sản phẩm cùng danh mục.
3. Sản phẩm hidden hoặc đã xoá → 404.

## Tiêu chí hoàn thành
- Test pass: slug đúng 200, slug sai/sản phẩm ẩn 404, related không chứa chính sản phẩm đó.
