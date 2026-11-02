# 24 – Trang đơn hàng của tôi
**Mục tiêu:** Khách theo dõi và huỷ đơn.
**Phụ thuộc:** 21, 23
**File tạo/sửa:** `src/pages/store/MyOrdersPage.jsx`, `src/pages/store/OrderDetailPage.jsx`, `src/components/OrderStatusBadge.jsx`

## Các bước
1. Danh sách đơn: tab lọc theo trạng thái, mã, ngày, tổng tiền, badge trạng thái + trạng thái thanh toán.
2. Chi tiết đơn: timeline trạng thái, sản phẩm, địa chỉ, tổng; đơn QR chưa thanh toán hiện lại `BankQrBox`.
3. Nút "Huỷ đơn" (chỉ pending) có hộp xác nhận.

## Tiêu chí hoàn thành
- Huỷ đơn pending → trạng thái đổi ngay, nút huỷ biến mất; đơn đã confirmed không có nút huỷ.
