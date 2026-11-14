# 51 – Cảnh báo hết hàng / sắp hết ở trang Sản phẩm (admin) — task phụ
**Mục tiêu:** Admin thấy ngay sản phẩm cần nhập hàng khi mở trang Sản phẩm.
**Phụ thuộc:** 29, 45

## Đã làm
- API `GET /admin/products`: tham số `stock = out | low` (hết hàng / sắp hết còn hàng); `meta.stock_alerts { out_of_stock, low_stock }` đếm toàn cửa hàng.
- Thông báo "Cần nhập hàng" đầu trang (đỏ nếu có hàng hết, cam nếu chỉ sắp hết) + nút lọc nhanh + nút sang Kho; điện thoại: nút nằm dưới chữ.
- Nhãn `StockStatus` dùng chung cho Sản phẩm và Kho: "Hết hàng" đỏ, số tồn + "Sắp hết" cam, có icon.
- Badge cam trên menu "Sản phẩm" (`summary.low_stock`, gồm cả hàng hết).
- Test: thêm 2 test vào `Admin/ProductTest.php`.

## Tiêu chí hoàn thành
- `php artisan test --compact` đạt; lint / build đạt; nút "Xem hết hàng" lọc đúng, badge menu đúng số.
