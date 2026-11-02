# 06 – API xác thực
**Mục tiêu:** Đăng ký, đăng nhập, đăng xuất, hồ sơ, đổi mật khẩu.
**Phụ thuộc:** 04
**File tạo/sửa:** `app/Http/Controllers/Api/AuthController.php`, `ProfileController.php`, `app/Http/Requests/Auth/*`, `app/Http/Resources/UserResource.php`, `tests/Feature/AuthTest.php`

## Các bước (TDD: viết test trước)
1. `POST auth/register` (name, email unique, phone, password confirmed) → `{user, token}`.
2. `POST auth/login` → sai thông tin 422; `is_active=false` → 403 "Tài khoản đã bị khoá".
3. `POST auth/logout` xoá token hiện tại.
4. `GET me`, `PUT me` (name, phone), `PUT me/password` (current_password, password confirmed).

## Tiêu chí hoàn thành
- `php artisan test --filter=AuthTest` pass: đăng ký, trùng email, đăng nhập đúng/sai, tài khoản khoá, logout vô hiệu token, đổi mật khẩu với mật khẩu cũ sai.
