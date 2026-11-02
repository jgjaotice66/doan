# 39 – Dữ liệu demo đẹp
**Mục tiêu:** Dữ liệu trông như cửa hàng thật khi bảo vệ.
**Phụ thuộc:** 05, 36
**File tạo/sửa:** `database/seeders/*`, `database/seeders/data/*.json`, `storage/app/public/seed/*`

## Các bước
1. Thay sản phẩm factory bằng ~40–60 sản phẩm có tên, mô tả, giá thực tế (JSON), ảnh thật đặt sẵn trong thư mục seed.
2. Banner + 6 bài NEWS có nội dung tiếng Việt.
3. ~30 đơn hàng rải 60 ngày qua, đủ các trạng thái → dashboard có đồ thị đẹp.
4. Lệnh `php artisan app:reset-demo` (migrate:fresh --seed + storage:link) để reset nhanh trước buổi bảo vệ.

## Tiêu chí hoàn thành
- Chạy `app:reset-demo` một lần ra trạng thái demo hoàn chỉnh, không có ảnh vỡ.
