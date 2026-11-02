# 10 – Trang đăng nhập / đăng ký
**Mục tiêu:** Người dùng tạo tài khoản và đăng nhập từ giao diện.
**Phụ thuộc:** 06, 09
**File tạo/sửa:** `src/api/auth.js`, `src/pages/store/LoginPage.jsx`, `src/pages/store/RegisterPage.jsx`

## Các bước
1. Form bằng react-hook-form; hiện lỗi theo field từ `errors` của API 422.
2. Đăng nhập thành công → lưu token, chuyển về `redirect` hoặc `/` (admin → `/admin`).
3. Menu tài khoản trên header: tên user, đăng xuất.

## Tiêu chí hoàn thành
- Đăng ký → tự đăng nhập; reload vẫn giữ đăng nhập; email trùng hiện lỗi dưới ô email; đăng xuất xoá token.
