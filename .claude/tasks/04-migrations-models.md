# 04 – Migration & Model
**Mục tiêu:** Tạo toàn bộ bảng theo spec và model có quan hệ.
**Phụ thuộc:** 03
**File tạo/sửa:** `database/migrations/*`, `app/Models/*`, `app/Enums/*`

## Các bước
1. Sửa migration users: thêm `phone` (nullable), `role` (default `customer`), `is_active` (default true).
2. Tạo migration: categories, brands, products (soft deletes; index `slug`, `status`, `min_age`, `price`), product_images, cart_items (unique user_id+product_id), wishlists (unique), orders (unique `code`), order_items, stock_movements, posts, banners.
3. Tiền dùng `unsignedBigInteger` (VND, không số lẻ).
4. Enum PHP: `UserRole`, `OrderStatus`, `PaymentMethod`, `PaymentStatus`, `StockReason`; khai báo cast trong model.
5. Model + quan hệ: Product belongsTo Category/Brand, hasMany images; Order hasMany items, belongsTo User; User hasMany orders/cartItems, belongsToMany wishlist products; Category self-relation parent/children.
6. Accessor `Product::final_price` (sale_price ?? price), `User::isAdmin()`.

## Tiêu chí hoàn thành
- `php artisan migrate:fresh` không lỗi; `php artisan db:show` liệt kê đủ 13 bảng nghiệp vụ.
