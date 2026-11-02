# 11 – API danh mục, thương hiệu, banner (public)
**Mục tiêu:** Frontend lấy được dữ liệu cho menu, bộ lọc, slider trang chủ.
**Phụ thuộc:** 05
**File tạo/sửa:** `app/Http/Controllers/Api/CategoryController.php`, `BrandController.php`, `BannerController.php`, `app/Http/Resources/*`, `tests/Feature/CatalogTest.php`

## Các bước
1. `GET categories` → cây danh mục (cha + children) kèm số sản phẩm active.
2. `GET brands` → danh sách thương hiệu.
3. `GET banners` → chỉ banner `is_active`, sắp theo `sort_order`.
4. Trả URL ảnh đầy đủ (`Storage::url`); chạy `php artisan storage:link`.

## Tiêu chí hoàn thành
- Test pass: banner ẩn không xuất hiện; danh mục có children đúng.
