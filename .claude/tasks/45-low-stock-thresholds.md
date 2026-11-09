# 45 – Ngưỡng "sắp hết hàng" chung / theo danh mục / theo sản phẩm — task phụ
**Mục tiêu:** Admin tự đặt khi nào một sản phẩm bị coi là "sắp hết" (tồn ≤ ngưỡng), thay cho số 5 cố định trong `.env`.
**Phụ thuộc:** 31 (Kho), 27 (Danh mục), 42 (Cài đặt cửa hàng)

## Quy tắc đã chốt
- Thứ tự ưu tiên: **ngưỡng riêng sản phẩm → danh mục → danh mục cha → ngưỡng chung**. `null` = dùng mức trên.
- Ngưỡng chung lưu bảng `settings` (khoá `low_stock_threshold`), mặc định lấy `LOW_STOCK_THRESHOLD` trong `.env`. Sửa xong có hiệu lực ngay.
- Mỗi ngưỡng 0–1000; 0 = chỉ báo khi hết hẳn.
- Một quy tắc duy nhất ở `Product::lowStockThreshold()` (PHP, kèm nguồn để hiển thị) và scope `Product::lowStock()` (SQL `COALESCE`, để lọc/đếm).

## File tạo/sửa
- Migration `low_stock_threshold` (nullable) cho `categories`, `products`.
- `ShopSettings::lowStockThreshold()/updateLowStockThreshold()`; API `PUT /admin/settings/low-stock`, `GET /admin/settings` trả thêm ngưỡng.
- `PATCH /admin/inventory/{product}/threshold` (sửa nhanh ở màn Kho); `CategoryRequest`, `ProductRequest` nhận `low_stock_threshold`.
- Resource: `low_stock` theo ngưỡng thực tế; admin có thêm `low_stock_threshold` + `effective_low_stock_threshold {value, source, label}`.
- Dashboard / Kho / lọc sản phẩm admin / nhãn storefront dùng `lowStock()`.
- Frontend: thẻ "Kho hàng" ở Cài đặt; cột + ô ngưỡng ở Danh mục; ô ngưỡng ở form sản phẩm (gợi ý đang kế thừa mức nào); cột "Ngưỡng sắp hết" + sửa nhanh ở Kho; thanh tồn ở Dashboard theo ngưỡng từng sản phẩm.
- Test: `tests/Feature/Admin/LowStockThresholdTest.php`.

## Tiêu chí hoàn thành
- `php artisan test --compact` đạt.
- Demo: đặt Gundam = 10 → sản phẩm Gundam còn 8 hiện "sắp hết" ở Kho, Dashboard, cửa hàng; đặt riêng 1 sản phẩm = 2 → hết "sắp hết"; đổi ngưỡng chung → các danh mục không đặt riêng đổi theo.
