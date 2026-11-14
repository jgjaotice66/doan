# Toy Store – Backend (Laravel 13 API)

REST API `/api/v1` cho cửa hàng đồ chơi sưu tầm: Laravel 13, PHP 8.3, MySQL, Sanctum.

- Cài đặt, chạy, tài khoản demo, biến `.env`: xem [README chính](../README.md).
- Danh sách API: [docs/api.md](../docs/api.md) · Cơ sở dữ liệu: [docs/erd.md](../docs/erd.md) · Luồng nghiệp vụ: [docs/flows.md](../docs/flows.md).

Lệnh hay dùng:

```bash
php artisan serve                    # chạy API tại http://localhost:8000
php artisan test                     # chạy toàn bộ test (database toystore_test)
php artisan app:reset-demo --force   # xoá dữ liệu, nạp lại dữ liệu demo
vendor/bin/pint                      # định dạng code PHP
```
