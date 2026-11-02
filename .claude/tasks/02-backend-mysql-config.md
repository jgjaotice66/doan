# 02 – Chuyển backend sang MySQL
**Mục tiêu:** Laravel kết nối MySQL thay cho SQLite, có file cấu hình nghiệp vụ.
**Phụ thuộc:** 01
**File tạo/sửa:** `backend/.env`, `backend/.env.example`, `backend/phpunit.xml`, `backend/config/shop.php`

## Các bước
1. Tạo DB `toystore` và `toystore_test` (utf8mb4_unicode_ci) qua XAMPP/Laragon.
2. `.env`: `DB_CONNECTION=mysql`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=toystore`, user/pass; `APP_LOCALE=vi`, `APP_FAKER_LOCALE=vi_VN`, `APP_TIMEZONE=Asia/Ho_Chi_Minh`.
3. Biến nghiệp vụ: `SHIPPING_FEE=30000`, `LOW_STOCK_THRESHOLD=5`, `VIETQR_BANK`, `VIETQR_ACCOUNT`, `VIETQR_ACCOUNT_NAME`, `FRONTEND_URL=http://localhost:5173` → đọc qua `config/shop.php`.
4. Cập nhật `.env.example` tương tự (không chứa mật khẩu thật).
5. `phpunit.xml`: dùng `DB_CONNECTION=mysql`, `DB_DATABASE=toystore_test`.
6. Xoá `database/database.sqlite`.

## Tiêu chí hoàn thành
- `php artisan migrate` chạy thành công trên MySQL.
- `php artisan tinker --execute="echo config('shop.shipping_fee');"` in ra `30000`.
