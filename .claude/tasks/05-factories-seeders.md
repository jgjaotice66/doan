# 05 – Factory & Seeder dữ liệu demo
**Mục tiêu:** Có dữ liệu demo ngay sau `migrate:fresh --seed`.
**Phụ thuộc:** 04
**File tạo/sửa:** `database/factories/*`, `database/seeders/*`

## Các bước
1. Factory cho mọi model chính.
2. Seeder: 1 admin (`admin@toystore.test` / `password`), 5 khách hàng, 8 danh mục (Figure, Gundam/Gunpla, LEGO, Mô hình xe, Funko Pop, Anime Figure, Board game, Phụ kiện), 10 thương hiệu (Bandai, LEGO, Hasbro, Mattel, Good Smile, Funko, Tamiya, Hot Toys, Kotobukiya, Tomica).
3. ~60 sản phẩm, mỗi sản phẩm 1–3 ảnh placeholder, min_age đa dạng, một số có sale_price, một số tồn kho thấp.
4. 3 banner, 6 bài NEWS (dữ liệu tạm; ảnh/dữ liệu đẹp làm ở task 39).

## Tiêu chí hoàn thành
- `php artisan migrate:fresh --seed` không lỗi; số bản ghi mỗi bảng đúng như trên.
