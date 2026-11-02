# 37 – Dashboard: giao diện
**Mục tiêu:** Trang tổng quan trực quan để demo.
**Phụ thuộc:** 36, 26
**File tạo/sửa:** `src/api/admin/dashboard.js`, `src/pages/admin/DashboardPage.jsx`

## Các bước
1. Đọc skill `dataviz` trước khi làm biểu đồ.
2. Hàng thẻ số liệu (`Statistic`) từ `summary`.
3. Biểu đồ đường doanh thu (chuyển 30 ngày / 12 tháng), biểu đồ cột/donut trạng thái đơn (`@ant-design/plots`).
4. Bảng top sản phẩm bán chạy + danh sách sắp hết hàng (link sang Kho).

## Tiêu chí hoàn thành
- Với dữ liệu seed, mọi biểu đồ có số liệu; hoàn thành một đơn mới → doanh thu hôm nay tăng sau khi tải lại.
