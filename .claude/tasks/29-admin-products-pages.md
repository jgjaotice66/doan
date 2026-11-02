# 29 – Admin: giao diện sản phẩm
**Mục tiêu:** Danh sách và form sản phẩm đầy đủ.
**Phụ thuộc:** 28
**File tạo/sửa:** `src/api/admin/products.js`, `src/pages/admin/ProductsPage.jsx`, `src/pages/admin/ProductFormPage.jsx`

## Các bước
1. Bảng: ảnh, tên, SKU, danh mục, thương hiệu, giá, tồn kho (đỏ nếu thấp), trạng thái; lọc + tìm kiếm.
2. Form tạo/sửa (trang riêng): thông tin, giá, độ tuổi, nổi bật, trạng thái, mô tả.
3. Khu ảnh: `Upload` antd nhiều ảnh, xoá, kéo thả hoặc nút lên/xuống để sắp thứ tự.

## Tiêu chí hoàn thành
- Tạo sản phẩm mới có 3 ảnh → hiện đúng trên storefront; ẩn sản phẩm → biến mất khỏi storefront.
