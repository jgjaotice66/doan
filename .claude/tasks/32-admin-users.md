# 32 – Admin: người dùng
**Mục tiêu:** Xem khách hàng, khoá/mở khoá tài khoản.
**Phụ thuộc:** 26
**File tạo/sửa:** `app/Http/Controllers/Api/Admin/UserController.php`, `tests/Feature/Admin/UserManageTest.php`, `src/pages/admin/UsersPage.jsx`

## Các bước
1. `GET admin/users` (q, role, is_active) kèm số đơn và tổng chi tiêu.
2. `PATCH admin/users/{id}/toggle-active`: khoá thì xoá toàn bộ token của user; không cho tự khoá chính mình.
3. Giao diện: bảng + Switch khoá/mở có xác nhận; xem nhanh đơn của user.

## Tiêu chí hoàn thành
- Test pass: khoá user → token cũ bị 401, đăng nhập lại 403; admin tự khoá mình → 422.
