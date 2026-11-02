# 22 – Trang giỏ hàng
**Mục tiêu:** Khách xem và chỉnh giỏ hàng.
**Phụ thuộc:** 17, 18
**File tạo/sửa:** `src/api/cart.js`, `src/features/cart/*`, `src/pages/store/CartPage.jsx`, header (badge số lượng)

## Các bước
1. Nối nút "Thêm vào giỏ" ở trang chi tiết và ProductCard (toast thành công).
2. Trang giỏ: danh sách item, tăng/giảm/xoá (react-query mutation, invalidate `cart`), cảnh báo item `unavailable`.
3. Tóm tắt: tạm tính, phí ship, tổng; nút "Thanh toán" (disable nếu giỏ rỗng hoặc có item không khả dụng).
4. Badge số lượng trên header lấy từ query `cart`.

## Tiêu chí hoàn thành
- Thêm/sửa/xoá cập nhật ngay tổng tiền và badge; vượt tồn kho hiện thông báo lỗi từ API.
