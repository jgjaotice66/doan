# 17 – Trang chi tiết sản phẩm
**Mục tiêu:** Hiển thị đầy đủ sản phẩm và cho phép thêm giỏ/yêu thích.
**Phụ thuộc:** 13, 14
**File tạo/sửa:** `src/pages/store/ProductDetailPage.jsx`, `src/components/ProductGallery.jsx`

## Các bước
1. Gallery ảnh (ảnh lớn + thumbnail).
2. Thông tin: tên, thương hiệu, SKU, độ tuổi, giá, tình trạng kho, mô tả.
3. Chọn số lượng (giới hạn theo tồn kho), nút "Thêm vào giỏ" và "Yêu thích" (tạm disable, nối API ở task 22/25; chưa đăng nhập → chuyển `/login`).
4. Breadcrumb + sản phẩm liên quan.
5. Slug sai → trang 404.

## Tiêu chí hoàn thành
- Mở được mọi sản phẩm seed; hết hàng thì nút thêm giỏ bị khoá.
