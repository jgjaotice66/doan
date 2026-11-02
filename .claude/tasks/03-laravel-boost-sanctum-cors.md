# 03 – Laravel Boost, Sanctum, CORS
**Mục tiêu:** Có route API `/api/v1`, auth bằng token, frontend gọi được.
**Phụ thuộc:** 02
**File tạo/sửa:** `routes/api.php`, `config/cors.php`, `bootstrap/app.php`

## Các bước
1. `composer require laravel/boost --dev` + `php artisan boost:install` (theo `backend/CLAUDE.md`), đọc lại guideline được sinh ra.
2. `php artisan install:api` (cài Sanctum + `routes/api.php`).
3. Group route `Route::prefix('v1')`; route kiểm tra `GET /api/v1/ping` → `{"status":"ok"}`.
4. `php artisan config:publish cors`; `allowed_origins` = `config('shop.frontend_url')`.
5. `bootstrap/app.php`: request `api/*` luôn render exception dạng JSON.

## Tiêu chí hoàn thành
- `curl http://localhost:8000/api/v1/ping` → `{"status":"ok"}`.
- Route không tồn tại trả JSON 404, không phải HTML.
