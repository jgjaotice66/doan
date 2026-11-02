# 12 – API danh sách sản phẩm + bộ lọc
**Mục tiêu:** `GET products` hỗ trợ tìm kiếm, lọc, sắp xếp, phân trang.
**Phụ thuộc:** 05
**File tạo/sửa:** `app/Http/Controllers/Api/ProductController.php`, `app/Http/Requests/ProductIndexRequest.php`, `app/Http/Resources/ProductResource.php`, `tests/Feature/ProductListTest.php`

## Các bước (TDD)
1. Tham số: `q` (tên/sku), `category` (slug, gồm cả danh mục con), `brand` (slug, nhiều giá trị), `min_age`, `price_min`, `price_max` (theo final price), `featured`, `sort` (`newest|price_asc|price_desc|best_selling`), `page`, `per_page` (tối đa 48).
2. Chỉ trả sản phẩm `status=active`.
3. Resource dạng thẻ: id, name, slug, price, sale_price, final_price, thumbnail, brand, in_stock.
4. Eager load để tránh N+1.

## Tiêu chí hoàn thành
- Test pass cho từng bộ lọc, kết hợp nhiều bộ lọc, sắp xếp giá, sản phẩm ẩn không xuất hiện, `per_page` > 48 bị giới hạn.
