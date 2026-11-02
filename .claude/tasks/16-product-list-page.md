# 16 – Trang danh sách sản phẩm
**Mục tiêu:** Khách tìm và lọc sản phẩm dễ dàng.
**Phụ thuộc:** 12, 14
**File tạo/sửa:** `src/pages/store/ProductListPage.jsx`, `src/components/FilterSidebar.jsx`, `src/features/catalog/useProducts.js`

## Các bước
1. Sidebar lọc: danh mục, thương hiệu (checkbox), độ tuổi (0+, 3+, 6+, 8+, 14+, 18+), khoảng giá; trên mobile là drawer.
2. Thanh trên: số kết quả, dropdown sắp xếp, nút xoá bộ lọc.
3. Toàn bộ bộ lọc đồng bộ với URL query (`useSearchParams`) → chia sẻ link/back được.
4. Ô tìm kiếm trên header chuyển tới `/products?q=...`.
5. Phân trang; trạng thái rỗng "Không tìm thấy sản phẩm".

## Tiêu chí hoàn thành
- Đổi bộ lọc cập nhật URL và kết quả; reload giữ nguyên bộ lọc; nút Back quay về trạng thái lọc trước.
