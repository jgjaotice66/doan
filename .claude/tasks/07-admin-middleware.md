# 07 – Middleware admin
**Mục tiêu:** Chặn khách hàng truy cập `/api/v1/admin/*`.
**Phụ thuộc:** 06
**File tạo/sửa:** `app/Http/Middleware/EnsureAdmin.php`, `bootstrap/app.php`, `routes/api.php`, `tests/Feature/AdminAccessTest.php`

## Các bước
1. Middleware kiểm tra `$request->user()->isAdmin()`, không phải → 403.
2. Đăng ký alias `admin`; group `prefix('admin')->middleware(['auth:sanctum', 'admin'])`.
3. Route kiểm tra `GET admin/ping`.

## Tiêu chí hoàn thành
- Test pass: khách → 403, chưa đăng nhập → 401, admin → 200.
