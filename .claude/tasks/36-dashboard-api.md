# 36 – Dashboard: API thống kê
**Mục tiêu:** Số liệu cho trang tổng quan admin.
**Phụ thuộc:** 21
**File tạo/sửa:** `app/Services/DashboardService.php`, `app/Http/Controllers/Api/Admin/DashboardController.php`, `tests/Feature/Admin/DashboardTest.php`

## Các bước (TDD)
1. Quy ước doanh thu = tổng `total` của đơn `completed` (ghi rõ trong báo cáo).
2. `summary`: doanh thu hôm nay / tháng này, số đơn mới hôm nay, số đơn pending, số khách mới tháng này, số sản phẩm sắp hết.
3. `revenue?range=30d|12m`: chuỗi theo ngày/tháng, điền 0 cho ngày không có đơn.
4. `top-products?limit=10`: theo số lượng bán (đơn completed).
5. `order-status`: số đơn theo từng trạng thái.

## Tiêu chí hoàn thành
- Test pass với dữ liệu tự tạo: đơn cancelled/pending không tính doanh thu; ngày trống có giá trị 0.
