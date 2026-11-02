# 33 – Admin: banner trang chủ
**Mục tiêu:** Đổi slider trang chủ không cần sửa code.
**Phụ thuộc:** 26, 11
**File tạo/sửa:** `app/Http/Controllers/Api/Admin/BannerController.php`, `tests/Feature/Admin/BannerTest.php`, `src/pages/admin/BannersPage.jsx`

## Các bước
1. CRUD banner (ảnh bắt buộc khi tạo, title, link, sort_order, is_active); xoá banner xoá cả file ảnh.
2. Giao diện: bảng có ảnh xem trước, Switch bật/tắt, chỉnh thứ tự.

## Tiêu chí hoàn thành
- Tắt một banner → biến mất khỏi slider trang chủ; đổi thứ tự → slider đổi theo.
