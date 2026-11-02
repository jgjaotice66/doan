# 27 – Admin: danh mục & thương hiệu
**Mục tiêu:** CRUD danh mục và thương hiệu (API + giao diện).
**Phụ thuộc:** 26
**File tạo/sửa:** `app/Http/Controllers/Api/Admin/CategoryController.php`, `BrandController.php`, `app/Http/Requests/Admin/*`, `tests/Feature/Admin/CategoryBrandTest.php`, `src/pages/admin/CategoriesPage.jsx`, `BrandsPage.jsx`

## Các bước
1. API CRUD; slug tự sinh từ tên (hỗ trợ tiếng Việt, `Str::slug`), unique.
2. Upload ảnh danh mục / logo thương hiệu (jpg/png/webp ≤ 2MB).
3. Không cho xoá khi còn sản phẩm → 422 thông báo rõ.
4. Giao diện: bảng + Modal form; danh mục chọn được danh mục cha.

## Tiêu chí hoàn thành
- Test pass: tạo/sửa/xoá, xoá khi còn sản phẩm bị chặn, khách gọi API bị 403.
